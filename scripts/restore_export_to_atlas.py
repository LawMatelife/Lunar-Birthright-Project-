#!/usr/bin/env python3
"""Safely restore a verified Lunar Birthright JSON export into an empty Atlas DB.

Safety properties:
- Dry-run by default; `--apply` is required for writes.
- Requires MONGO_URL and DB_NAME from the environment.
- Refuses a non-empty target collection.
- Preserves source `_id`, application IDs, ownership links and plot coordinates.
- Never drops a collection or database.
- If an insert fails, only documents inserted by this run are rolled back.
- Verifies canonical collection content after insertion without printing PII.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import zipfile
from pathlib import Path
from typing import Any

from pymongo import MongoClient

COLLECTION_FILES = {
    "users": "users.json",
    "plots": "plots.json",
    "payment_transactions": "payment_transactions.json",
    "certificates": "certificates.json",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_digest(docs: list[dict[str, Any]]) -> str:
    ordered = sorted(docs, key=lambda d: str(d.get("_id", "")))
    payload = json.dumps(ordered, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return sha256(payload)


def load_export(path: Path) -> tuple[dict[str, list[dict[str, Any]]], str]:
    raw = path.read_bytes()
    with zipfile.ZipFile(path) as zf:
        missing = [filename for filename in COLLECTION_FILES.values() if filename not in zf.namelist()]
        if missing:
            raise ValueError(f"required export files missing: {', '.join(missing)}")
        data: dict[str, list[dict[str, Any]]] = {}
        for collection, filename in COLLECTION_FILES.items():
            value = json.loads(zf.read(filename))
            if not isinstance(value, list) or any(not isinstance(doc, dict) for doc in value):
                raise ValueError(f"{filename} must contain a JSON array of objects")
            ids = [doc.get("_id") for doc in value]
            if None in ids or len(ids) != len(set(ids)):
                raise ValueError(f"{filename} contains missing or duplicate _id values")
            data[collection] = value
    return data, sha256(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description="Restore a verified Lunar Birthright export into empty Atlas collections")
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("--apply", action="store_true", help="perform inserts; otherwise dry-run only")
    parser.add_argument("--expected-zip-sha256", default=None,
                        help="refuse the restore unless the export ZIP matches this SHA-256")
    parser.add_argument("--timeout-ms", type=int, default=8000)
    args = parser.parse_args()

    if not args.zip_path.is_file():
        print("RESTORE_FAIL: export ZIP not found", file=sys.stderr)
        return 2

    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not mongo_url or not db_name:
        print("RESTORE_FAIL: MONGO_URL and DB_NAME must be configured", file=sys.stderr)
        return 2
    if db_name != "lunar_birthright":
        print("RESTORE_FAIL: DB_NAME must be exactly lunar_birthright for this release", file=sys.stderr)
        return 2

    try:
        source, zip_hash = load_export(args.zip_path)
    except Exception as exc:
        print(f"RESTORE_FAIL: invalid source export: {type(exc).__name__}: {str(exc)[:300]}", file=sys.stderr)
        return 2

    if args.expected_zip_sha256 and zip_hash.lower() != args.expected_zip_sha256.lower():
        print("RESTORE_FAIL: export ZIP SHA-256 does not match the expected value", file=sys.stderr)
        return 2

    client = MongoClient(
        mongo_url,
        serverSelectionTimeoutMS=args.timeout_ms,
        connectTimeoutMS=args.timeout_ms,
        socketTimeoutMS=args.timeout_ms,
        appname="lunar-birthright-safe-restore",
    )
    inserted_ids: dict[str, list[Any]] = {}
    try:
        client.admin.command("ping")
        db = client[db_name]
        target_counts = {name: db[name].count_documents({}) for name in COLLECTION_FILES}
        nonempty = {name: count for name, count in target_counts.items() if count != 0}
        if nonempty:
            print(f"RESTORE_FAIL: target collections are not empty: {sorted(nonempty)}", file=sys.stderr)
            return 3

        source_counts = {name: len(docs) for name, docs in source.items()}
        plan = {
            "database": db_name,
            "atlas_ping": "ok",
            "source_zip_sha256": zip_hash,
            "source_counts": source_counts,
            "target_counts_before": target_counts,
            "mode": "apply" if args.apply else "dry-run",
        }
        print(json.dumps(plan, indent=2, sort_keys=True))

        if not args.apply:
            print("RESTORE_DRY_RUN_OK — target is empty; rerun with --apply only after source audit/review")
            return 0

        try:
            for name in ("users", "plots", "payment_transactions", "certificates"):
                docs = source[name]
                if docs:
                    result = db[name].insert_many(docs, ordered=True)
                    inserted_ids[name] = list(result.inserted_ids)
        except Exception:
            for name, ids in reversed(list(inserted_ids.items())):
                if ids:
                    db[name].delete_many({"_id": {"$in": ids}})
            raise

        verification = {}
        for name, source_docs in source.items():
            target_docs = list(db[name].find({}))
            verification[name] = {
                "count": len(target_docs),
                "expected_count": len(source_docs),
                "content_match": canonical_digest(target_docs) == canonical_digest(source_docs),
            }

        if not all(v["count"] == v["expected_count"] and v["content_match"] for v in verification.values()):
            print(json.dumps({"verification": verification}, indent=2, sort_keys=True))
            print("RESTORE_FAIL: post-insert verification mismatch; no automatic destructive cleanup performed", file=sys.stderr)
            return 4

        print(json.dumps({"verification": verification}, indent=2, sort_keys=True))
        print("RESTORE_OK — exact source documents restored and verified")
        return 0
    except Exception as exc:
        # Never echo credentials; normal driver errors do not contain MONGO_URL here.
        print(f"RESTORE_FAIL: {type(exc).__name__}: {str(exc)[:300]}", file=sys.stderr)
        return 5
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
