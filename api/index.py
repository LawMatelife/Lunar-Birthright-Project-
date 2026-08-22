from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    "p00.txt",
    "p01a.txt",
    "p01b.txt",
    "p01c.txt",
    "p01d0.txt",
    "p01d1.txt",
    "p01d2.txt",
    "p01d3.txt",
    "p02.txt",
    "p03a.txt",
    "p03b.txt",
    "p03c.txt",
    "p03d.txt",
    "p04.txt",
    "p05.txt",
    "p06.txt",
]
EXPECTED_B64_LENGTH = 51796
EXPECTED_B64_SHA256 = "2ac8d06a6811bec542b9d31b2010d19d6cdfa41eb86ebc4ee05e9bd922c3bcf9"
EXPECTED_ARCHIVE_LENGTH = 38845
EXPECTED_ARCHIVE_SHA256 = "325a1fba5c0b28ece000d00cd950ec530b61e29fba53de3a1dbfafd9864a4867"
RUNTIME_DIR = Path("/tmp/lbp_backend_v4_325a1fba")
ARCHIVE_PATH = Path("/tmp/lbp_backend_v4.tar.gz")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _prepare_runtime() -> None:
    server_path = RUNTIME_DIR / "server.py"
    if server_path.exists():
        return

    encoded = "".join((ROOT / "backend_bundle" / part).read_text(encoding="utf-8") for part in PARTS)
    encoded_bytes = encoded.encode("ascii")
    if len(encoded) != EXPECTED_B64_LENGTH:
        raise RuntimeError(f"Backend bundle text length mismatch: {len(encoded)}")
    if _sha256(encoded_bytes) != EXPECTED_B64_SHA256:
        raise RuntimeError("Backend bundle text SHA-256 mismatch")

    archive = base64.b64decode(encoded_bytes, validate=True)
    if len(archive) != EXPECTED_ARCHIVE_LENGTH:
        raise RuntimeError(f"Backend archive length mismatch: {len(archive)}")
    if _sha256(archive) != EXPECTED_ARCHIVE_SHA256:
        raise RuntimeError("Backend archive SHA-256 mismatch")

    ARCHIVE_PATH.write_bytes(archive)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    with tarfile.open(ARCHIVE_PATH, "r:gz") as tf:
        for member in tf.getmembers():
            target = (RUNTIME_DIR / member.name).resolve()
            if RUNTIME_DIR.resolve() not in target.parents and target != RUNTIME_DIR.resolve():
                raise RuntimeError("Unsafe path in backend runtime archive")
        tf.extractall(RUNTIME_DIR)


_prepare_runtime()
sys.path.insert(0, str(RUNTIME_DIR))
os.chdir(RUNTIME_DIR)

from server import app  # noqa: E402,F401
