#!/usr/bin/env python3
"""Fail CI if credentials, private exports, or preview diagnostics reach Git.

The scanner inspects Git-tracked text paths and never prints a detected secret
value. Detailed deployment diagnostics are allowed on preview branches only and
are blocked from `main` / pull requests targeting `main`.
"""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
    ".zip", ".gz", ".tgz", ".tar", ".woff", ".woff2", ".ttf", ".pyc",
}

FORBIDDEN_TRACKED_NAMES = {
    ".env", ".env.local", ".env.production", ".env.preview", ".env.development",
}

FORBIDDEN_EXPORT_SUFFIXES = {".bson", ".archive", ".dump"}
FORBIDDEN_EXPORT_DIRS = {"dump", "backups", "mongo-dump", "database-dump"}

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Stripe secret key", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("Stripe webhook signing secret", re.compile(r"\bwhsec_[A-Za-z0-9]{16,}\b")),
    ("PEM private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    (
        "MongoDB URI with embedded credentials",
        re.compile(r"mongodb(?:\+srv)?://([^:/\s]+):([^@/\s]+)@", re.IGNORECASE),
    ),
]


def tracked_files() -> list[Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [ROOT / p.decode("utf-8") for p in raw.split(b"\0") if p]


def is_placeholder_mongo(match: re.Match[str]) -> bool:
    user, password = match.group(1), match.group(2)
    return any(ch in user + password for ch in "<>") or "REPLACE" in (user + password).upper()


def is_database_export_path(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    parts = set(rel.parts[:-1])
    lowered_name = path.name.lower()
    return (
        bool(parts & FORBIDDEN_EXPORT_DIRS)
        or path.suffix.lower() in FORBIDDEN_EXPORT_SUFFIXES
        or bool(re.search(r"(?:database|mongo)[_-]?dump", lowered_name))
    )


def main_branch_diagnostic_gate(failures: list[str]) -> None:
    ref_name = os.getenv("GITHUB_REF_NAME", "")
    base_ref = os.getenv("GITHUB_BASE_REF", "")
    if ref_name != "main" and base_ref != "main":
        return

    diag = ROOT / "api" / "diag.py"
    if diag.exists():
        failures.append("preview diagnostic api/diag.py must be removed before main")

    vercel = ROOT / "vercel.json"
    if vercel.exists() and '"/api/diag"' in vercel.read_text(encoding="utf-8"):
        failures.append("preview /api/diag route must be removed before main")


def main() -> int:
    failures: list[str] = []
    for path in tracked_files():
        rel = path.relative_to(ROOT).as_posix()
        name = path.name

        if name in FORBIDDEN_TRACKED_NAMES or (name.startswith(".env.") and name != ".env.example"):
            failures.append(f"forbidden tracked environment file: {rel}")
            continue
        if is_database_export_path(path):
            failures.append(f"forbidden tracked database export/backup: {rel}")
            continue
        if path.suffix.lower() in BINARY_SUFFIXES or not path.is_file():
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for label, pattern in PATTERNS:
            for match in pattern.finditer(text):
                if label.startswith("MongoDB") and is_placeholder_mongo(match):
                    continue
                failures.append(f"{label} detected in {rel}")
                break

    main_branch_diagnostic_gate(failures)

    if failures:
        print("SECURITY_GATE_FAIL")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("SECURITY_GATE_OK — tracked secrets/backups blocked; diagnostic policy satisfied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
