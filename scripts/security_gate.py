#!/usr/bin/env python3
"""Fail CI if obvious credentials or sensitive export files are committed.

This is deliberately conservative: it scans Git-tracked text files only and
never prints the suspected secret value itself.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
    ".zip", ".gz", ".tgz", ".tar", ".woff", ".woff2", ".ttf",
    ".bson", ".pyc",
}

FORBIDDEN_TRACKED_NAMES = {
    ".env", ".env.local", ".env.production", ".env.preview", ".env.development",
}

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


def main() -> int:
    failures: list[str] = []
    for path in tracked_files():
        rel = path.relative_to(ROOT).as_posix()
        name = path.name
        if name in FORBIDDEN_TRACKED_NAMES or (name.startswith(".env.") and name != ".env.example"):
            failures.append(f"forbidden tracked environment file: {rel}")
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

    if failures:
        print("SECURITY_GATE_FAIL")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("SECURITY_GATE_OK — no obvious tracked secrets or forbidden env files detected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
