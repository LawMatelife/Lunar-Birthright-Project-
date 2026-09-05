#!/usr/bin/env python3
"""Read-only Atlas reconciliation helper for Lunar Birthright.

The script never inserts, updates or deletes database documents. It reports
collection counts only, so production/user data is not printed to the console.

Examples:
  python scripts/reconcile_atlas.py
  python scripts/reconcile_atlas.py --expect users=44 --expect plots=44 \
      --expect certificates=9 --expect payments=9
  python scripts/reconcile_atlas.py --write-manifest atlas-counts.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from pymongo import MongoClient


def parse_expectation(raw: str) -> tuple[str, int]:
    if "=" not in raw:
        raise argparse.ArgumentTypeError("expected format COLLECTION=COUNT")
    name, count = raw.split("=", 1)
    name = name.strip()
    if not name:
        raise argparse.ArgumentTypeError("collection name must not be empty")
    try:
        value = int(count)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("count must be an integer") from exc
    if value < 0:
        raise argparse.ArgumentTypeError("count must be >= 0")
    return name, value


def database_environment() -> tuple[str | None, str | None]:
    mongo_url = (os.getenv("MONGO_URL") or os.getenv("DATABASE_URL") or "").strip() or None
    db_name = (os.getenv("DB_NAME") or "").strip() or None
    if mongo_url and not db_name:
        if mongo_url.startswith(("mongodb://", "mongodb+srv://")):
            parsed = urlparse(mongo_url)
            db_name = (parsed.path or "").strip("/").split("/", 1)[0] or "lunar_birthright"
        else:
            db_name = "lunar_birthright"
    return mongo_url, db_name


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only MongoDB Atlas collection reconciliation")
    parser.add_argument("--expect", action="append", default=[], type=parse_expectation,
                        metavar="COLLECTION=COUNT", help="expected document count; repeat as needed")
    parser.add_argument("--write-manifest", type=Path, default=None,
                        help="write a local JSON count manifest (contains no document contents)")
    parser.add_argument("--timeout-ms", type=int, default=7000)
    args = parser.parse_args()

    mongo_url, db_name = database_environment()
    if not mongo_url:
        print("ATLAS_RECONCILE_FAIL: neither MONGO_URL nor DATABASE_URL is configured", file=sys.stderr)
        return 2
    if not db_name:
        print("ATLAS_RECONCILE_FAIL: DB_NAME could not be determined", file=sys.stderr)
        return 2

    client = MongoClient(
        mongo_url,
        serverSelectionTimeoutMS=args.timeout_ms,
        connectTimeoutMS=args.timeout_ms,
        socketTimeoutMS=args.timeout_ms,
        appname="lunar-birthright-reconcile",
    )
    try:
        client.admin.command("ping")
        db = client[db_name]
        collections = sorted(name for name in db.list_collection_names() if not name.startswith("system."))
        counts = {name: db[name].count_documents({}) for name in collections}
    except Exception as exc:
        print(f"ATLAS_RECONCILE_FAIL: {type(exc).__name__}: {str(exc)[:300]}", file=sys.stderr)
        return 3
    finally:
        client.close()

    expected = dict(args.expect)
    mismatches = {
        name: {"expected": wanted, "actual": counts.get(name)}
        for name, wanted in expected.items()
        if counts.get(name) != wanted
    }

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database": db_name,
        "atlas_ping": "ok",
        "collections": counts,
        "expected": expected,
        "mismatches": mismatches,
    }
    print(json.dumps(manifest, indent=2, sort_keys=True))

    if args.write_manifest:
        args.write_manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"COUNT_MANIFEST_WRITTEN {args.write_manifest}")

    if mismatches:
        print("ATLAS_RECONCILE_MISMATCH", file=sys.stderr)
        return 4

    print("ATLAS_RECONCILE_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
