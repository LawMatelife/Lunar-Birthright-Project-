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
EXPECTED_TEXT_SHA = "2ac8d06a6811bec542b9d31b2010d19d6cdfa41eb86ebc4ee05e9bd922c3bcf9"
EXPECTED_ARCHIVE_SHA = "325a1fba5c0b28ece000d00cd950ec530b61e29fba53de3a1dbfafd9864a4867"

encoded = "".join((ROOT / "backend_bundle" / p).read_text(encoding="utf-8") for p in PARTS)
if hashlib.sha256(encoded.encode("ascii")).hexdigest() != EXPECTED_TEXT_SHA:
    raise SystemExit("backend bundle text SHA mismatch")
archive = base64.b64decode(encoded, validate=True)
if hashlib.sha256(archive).hexdigest() != EXPECTED_ARCHIVE_SHA:
    raise SystemExit("backend archive SHA mismatch")

patterns = [
    re.compile(r"os\.getenv\(\s*['\"]([A-Z][A-Z0-9_]*)['\"]"),
    re.compile(r"os\.environ\.get\(\s*['\"]([A-Z][A-Z0-9_]*)['\"]"),
    re.compile(r"os\.environ\[\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*\]"),
]
found: dict[str, set[str]] = {}
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tf:
    for member in tf.getmembers():
        if not member.isfile() or not member.name.endswith(".py"):
            continue
        fh = tf.extractfile(member)
        if fh is None:
            continue
        text = fh.read().decode("utf-8")
        for pattern in patterns:
            for name in pattern.findall(text):
                found.setdefault(name, set()).add(member.name)

print("BACKEND_ENV_CONTRACT_BEGIN")
for name in sorted(found):
    print(f"{name:<32} {','.join(sorted(found[name]))}")
print("BACKEND_ENV_CONTRACT_END")
print("BACKEND_ENV_INSPECT_OK", len(found))
