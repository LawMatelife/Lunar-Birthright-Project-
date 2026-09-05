#!/usr/bin/env python3
"""Print selected public-source backend functions from the checked-in V4 bundle.

Read-only: decodes the source-controlled backend archive and prints only named
function definitions needed for integration review. It never executes backend
code or reads environment variables.
"""
from __future__ import annotations

import ast
import base64
import hashlib
import io
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    "p00.txt", "p01a.txt", "p01b.txt", "p01c.txt", "p01d0.txt", "p01d1.txt",
    "p01d2.txt", "p01d3.txt", "p02.txt", "p03a.txt", "p03b.txt", "p03c.txt",
    "p03d.txt", "p04.txt", "p05.txt", "p06.txt",
]
EXPECTED_B64_SHA256 = "2ac8d06a6811bec542b9d31b2010d19d6cdfa41eb86ebc4ee05e9bd922c3bcf9"
EXPECTED_ARCHIVE_SHA256 = "325a1fba5c0b28ece000d00cd950ec530b61e29fba53de3a1dbfafd9864a4867"
DEFAULT_NAMES = {
    "register",
    "create_certificate_checkout",
    "stripe_webhook",
    "grant_free_certificate",
    "get_admin_notifications",
    "get_admin_users_detailed",
    "get_plot_stats",
    "get_registry_counter",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def archive_bytes() -> bytes:
    encoded = "".join((ROOT / "backend_bundle" / p).read_text(encoding="utf-8") for p in PARTS)
    raw = encoded.encode("ascii")
    if sha256(raw) != EXPECTED_B64_SHA256:
        raise SystemExit("backend encoded SHA mismatch")
    archive = base64.b64decode(raw, validate=True)
    if sha256(archive) != EXPECTED_ARCHIVE_SHA256:
        raise SystemExit("backend archive SHA mismatch")
    return archive


def main() -> int:
    wanted = set(sys.argv[1:]) or DEFAULT_NAMES
    found: set[str] = set()
    with tarfile.open(fileobj=io.BytesIO(archive_bytes()), mode="r:gz") as tf:
        for member in tf.getmembers():
            if not member.isfile() or not member.name.endswith(".py"):
                continue
            fh = tf.extractfile(member)
            if fh is None:
                continue
            source = fh.read().decode("utf-8", errors="replace")
            try:
                tree = ast.parse(source, filename=member.name)
            except SyntaxError:
                continue
            lines = source.splitlines()
            for node in tree.body:
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) or node.name not in wanted:
                    continue
                found.add(node.name)
                start = min([d.lineno for d in node.decorator_list] + [node.lineno])
                end = getattr(node, "end_lineno", node.lineno)
                print(f"BACKEND_FUNCTION_BEGIN {node.name} [{member.name}] lines={start}-{end}")
                print("\n".join(lines[start - 1:end]))
                print(f"BACKEND_FUNCTION_END {node.name}")
    missing = sorted(wanted - found)
    if missing:
        print("BACKEND_FUNCTIONS_MISSING", ",".join(missing))
    print("BACKEND_FUNCTION_INSPECT_OK", ",".join(sorted(found)))
    return 0 if not missing else 2


if __name__ == "__main__":
    raise SystemExit(main())
