#!/usr/bin/env python3
"""Inspect the checked-in Lunar V4 backend bundle without executing it.

The bundle is already source-controlled in base64 chunks. This script verifies
its hashes, opens the tar archive in memory, and prints only route decorators,
function names, and selected collection/API keywords. It never imports the
backend, connects to MongoDB, or prints environment variables/secrets.
"""
from __future__ import annotations

import base64
import hashlib
import io
import re
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    "p00.txt", "p01a.txt", "p01b.txt", "p01c.txt", "p01d0.txt", "p01d1.txt",
    "p01d2.txt", "p01d3.txt", "p02.txt", "p03a.txt", "p03b.txt", "p03c.txt",
    "p03d.txt", "p04.txt", "p05.txt", "p06.txt",
]
EXPECTED_B64_LENGTH = 51796
EXPECTED_B64_SHA256 = "2ac8d06a6811bec542b9d31b2010d19d6cdfa41eb86ebc4ee05e9bd922c3bcf9"
EXPECTED_ARCHIVE_LENGTH = 38845
EXPECTED_ARCHIVE_SHA256 = "325a1fba5c0b28ece000d00cd950ec530b61e29fba53de3a1dbfafd9864a4867"

ROUTE_RE = re.compile(
    r"@(?P<owner>app|router|api_router)\.(?P<method>get|post|put|patch|delete)"
    r"\(\s*[rubfRUBF]*['\"](?P<path>[^'\"]+)['\"](?P<args>[^)]*)\)"
    r"\s*(?:\r?\n\s*)+(?:async\s+)?def\s+(?P<func>[A-Za-z_][A-Za-z0-9_]*)",
    re.MULTILINE,
)
COLLECTION_RE = re.compile(r"(?:db|database)\.([A-Za-z_][A-Za-z0-9_]*)")
KEYWORD_RE = re.compile(
    r"certificate|checkout|stripe|webhook|gift|claim|register|plot|citizen|mint|nft",
    re.IGNORECASE,
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    encoded = "".join((ROOT / "backend_bundle" / p).read_text(encoding="utf-8") for p in PARTS)
    raw_encoded = encoded.encode("ascii")
    assert len(encoded) == EXPECTED_B64_LENGTH, (len(encoded), EXPECTED_B64_LENGTH)
    assert sha256(raw_encoded) == EXPECTED_B64_SHA256
    archive = base64.b64decode(raw_encoded, validate=True)
    assert len(archive) == EXPECTED_ARCHIVE_LENGTH, (len(archive), EXPECTED_ARCHIVE_LENGTH)
    assert sha256(archive) == EXPECTED_ARCHIVE_SHA256

    routes: list[tuple[str, str, str, str]] = []
    collections: set[str] = set()
    keyword_files: set[str] = set()
    python_files = 0

    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tf:
        for member in tf.getmembers():
            if not member.isfile() or not member.name.endswith(".py"):
                continue
            python_files += 1
            extracted = tf.extractfile(member)
            if extracted is None:
                continue
            text = extracted.read().decode("utf-8", errors="replace")
            for match in ROUTE_RE.finditer(text):
                routes.append((member.name, match.group("method").upper(), match.group("path"), match.group("func")))
            collections.update(COLLECTION_RE.findall(text))
            if KEYWORD_RE.search(text):
                keyword_files.add(member.name)

    print("BACKEND_BUNDLE_VERIFIED", len(encoded), len(archive), python_files)
    print("BACKEND_ROUTE_MAP_BEGIN")
    for filename, method, path, func in sorted(routes, key=lambda x: (x[2], x[1], x[0])):
        print(f"{method:6} {path:42} {func:32} [{filename}]")
    print("BACKEND_ROUTE_MAP_END")
    print("BACKEND_COLLECTION_NAMES", ",".join(sorted(collections)))
    print("BACKEND_KEYWORD_FILES", ",".join(sorted(keyword_files)))
    print("BACKEND_ROUTE_INSPECT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
