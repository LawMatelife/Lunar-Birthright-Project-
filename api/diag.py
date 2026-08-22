from __future__ import annotations

import base64
import hashlib
import importlib.metadata
import os
from pathlib import Path
import re
import sys
import tarfile
import tempfile
from typing import Any

from fastapi import FastAPI

app = FastAPI(title="Lunar Birthright deployment diagnostic")

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
TEMP_DIR = Path(tempfile.gettempdir())
RUNTIME_DIR = TEMP_DIR / "lbp_backend_v4_diag_325a1fba"
ARCHIVE_PATH = TEMP_DIR / "lbp_backend_v4_diag.tar.gz"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_error(exc: BaseException) -> dict[str, str]:
    message = str(exc) or repr(exc)
    message = re.sub(r"(mongodb(?:\+srv)?://[^:/\s]+:)[^@\s]+@", r"\1<redacted>@", message, flags=re.I)
    message = re.sub(r"(https?://[^:/\s]+:)[^@\s]+@", r"\1<redacted>@", message, flags=re.I)
    for key, value in os.environ.items():
        upper = key.upper()
        if value and len(value) >= 8 and any(token in upper for token in ("SECRET", "TOKEN", "PASSWORD", "PASS", "KEY", "MONGO_URL")):
            message = message.replace(value, "<redacted>")
    return {"type": type(exc).__name__, "message": message[:800]}


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _reconstruct_backend() -> dict[str, Any]:
    encoded = "".join((ROOT / "backend_bundle" / part).read_text(encoding="utf-8") for part in PARTS)
    encoded_bytes = encoded.encode("ascii")
    result: dict[str, Any] = {
        "base64_length": len(encoded),
        "base64_sha256": _sha256(encoded_bytes),
    }
    if len(encoded) != EXPECTED_B64_LENGTH or result["base64_sha256"] != EXPECTED_B64_SHA256:
        result["ok"] = False
        result["reason"] = "bundle_text_integrity_failed"
        return result

    archive = base64.b64decode(encoded_bytes, validate=True)
    result.update({
        "archive_length": len(archive),
        "archive_sha256": _sha256(archive),
    })
    if len(archive) != EXPECTED_ARCHIVE_LENGTH or result["archive_sha256"] != EXPECTED_ARCHIVE_SHA256:
        result["ok"] = False
        result["reason"] = "archive_integrity_failed"
        return result

    ARCHIVE_PATH.write_bytes(archive)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    with tarfile.open(ARCHIVE_PATH, "r:gz") as tf:
        for member in tf.getmembers():
            target = (RUNTIME_DIR / member.name).resolve()
            if RUNTIME_DIR.resolve() not in target.parents and target != RUNTIME_DIR.resolve():
                raise RuntimeError("Unsafe path in backend runtime archive")
        tf.extractall(RUNTIME_DIR)
    result["ok"] = (RUNTIME_DIR / "server.py").exists()
    return result


def _mongo_ping() -> dict[str, Any]:
    mongo_url = (os.getenv("MONGO_URL") or "").strip()
    db_name = (os.getenv("DB_NAME") or "").strip()
    if not mongo_url:
        return {"ok": False, "reason": "MONGO_URL_missing_or_empty", "db_name_present": bool(db_name)}
    try:
        from pymongo import MongoClient

        client = MongoClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            appname="lunar-birthright-vercel-diagnostic",
        )
        try:
            client.admin.command("ping")
        finally:
            client.close()
        return {"ok": True, "db_name_present": bool(db_name)}
    except Exception as exc:
        return {"ok": False, "db_name_present": bool(db_name), "error": _safe_error(exc)}


def _server_import() -> dict[str, Any]:
    try:
        reconstruction = _reconstruct_backend()
        if not reconstruction.get("ok"):
            return {"ok": False, "reconstruction": reconstruction}
        runtime = str(RUNTIME_DIR)
        if runtime not in sys.path:
            sys.path.insert(0, runtime)
        old_cwd = os.getcwd()
        try:
            os.chdir(RUNTIME_DIR)
            import server  # type: ignore
            imported_app = getattr(server, "app", None)
            return {"ok": imported_app is not None, "app_type": type(imported_app).__name__ if imported_app is not None else None}
        finally:
            os.chdir(old_cwd)
    except Exception as exc:
        return {"ok": False, "error": _safe_error(exc)}


def _mongo_related_variable_names() -> list[str]:
    # Names only — never values. This catches a typo/alias such as MONGODB_URI
    # without exposing any credential material.
    names = []
    for key in os.environ:
        upper = key.upper()
        if "MONGO" in upper or upper in {"DB_NAME", "DATABASE_URL"}:
            names.append(key)
    return sorted(names)


@app.get("/")
@app.get("/api/diag")
async def diagnostic() -> dict[str, Any]:
    return {
        "status": "diagnostic",
        "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "packages": {
            "fastapi": _package_version("fastapi"),
            "motor": _package_version("motor"),
            "pymongo": _package_version("pymongo"),
            "pydantic": _package_version("pydantic"),
        },
        "deployment": {
            "vercel_env": os.getenv("VERCEL_ENV"),
            "vercel_url": os.getenv("VERCEL_URL"),
            "git_commit_ref": os.getenv("VERCEL_GIT_COMMIT_REF"),
            "git_commit_sha": os.getenv("VERCEL_GIT_COMMIT_SHA"),
        },
        "environment": {
            "MONGO_URL": bool((os.getenv("MONGO_URL") or "").strip()),
            "DB_NAME": bool((os.getenv("DB_NAME") or "").strip()),
            "STRIPE_SECRET_KEY": bool((os.getenv("STRIPE_SECRET_KEY") or "").strip()),
            "STRIPE_WEBHOOK_SECRET": bool((os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()),
            "CROSSMINT_API_KEY": bool((os.getenv("CROSSMINT_API_KEY") or "").strip()),
            "mongo_related_variable_names": _mongo_related_variable_names(),
        },
        "mongo": _mongo_ping(),
        "server_import": _server_import(),
    }
