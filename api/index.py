from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
import sys
import tarfile
import tempfile
from urllib.parse import urlparse

API_DIR = Path(__file__).resolve().parent
ROOT = API_DIR.parent
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
TEMP_DIR = Path(tempfile.gettempdir())
RUNTIME_DIR = TEMP_DIR / "lbp_backend_v4_325a1fba"
ARCHIVE_PATH = TEMP_DIR / "lbp_backend_v4.tar.gz"


def _normalise_database_environment() -> None:
    """Accept a Vercel DATABASE_URL alias only when it is genuinely MongoDB."""
    mongo_url = (os.getenv("MONGO_URL") or "").strip()
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    if not mongo_url and database_url.startswith(("mongodb://", "mongodb+srv://")):
        os.environ["MONGO_URL"] = database_url
        mongo_url = database_url

    if not (os.getenv("DB_NAME") or "").strip() and mongo_url:
        parsed = urlparse(mongo_url)
        path_name = (parsed.path or "").strip("/").split("/", 1)[0]
        os.environ["DB_NAME"] = path_name or "lunar_birthright"


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


_normalise_database_environment()
_prepare_runtime()
# Keep the extracted legacy server first, and our adjacent hardening modules second.
sys.path.insert(0, str(API_DIR))
sys.path.insert(0, str(RUNTIME_DIR))
os.chdir(RUNTIME_DIR)

import server  # noqa: E402
from runtime_hardening import install as install_runtime_hardening  # noqa: E402
from public_registry_hardening import install as install_public_registry_hardening  # noqa: E402

install_runtime_hardening(server)
install_public_registry_hardening(server)
app = server.app
