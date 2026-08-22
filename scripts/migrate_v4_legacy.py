#!/usr/bin/env python3
"""Controlled post-restore normalization for known V4 legacy fields.

Dry-run by default. This script NEVER changes plot IDs, plot owners, lunar
coordinates, historical payment amounts/currencies/statuses, certificates, or
NFT identifiers. With `--apply` it may only:
1. synchronize a user's `lunar_sector` to the sector on their referenced plot;
2. normalize a conservatively parseable legacy birth-date string to YYYY-MM-DD.

Ambiguous birth dates block application instead of being guessed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
from typing import Any

from pymongo import MongoClient, UpdateOne

ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
LEGACY = re.compile(r"^\s*(\d{1,2})[\s/.\-]+(\d{1,2})[\s/.\-]+(\d{2}|\d{4})\s*$")


def normalize_birth_date(value: Any, today: dt.date) -> tuple[str | None, str]:
    if not isinstance(value, str) or not value.strip():
        return None, "missing"
    raw = value.strip()
    if ISO.fullmatch(raw):
        try:
            parsed = dt.datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            return None, "invalid_iso"
        return raw if parsed <= today else None, "iso" if parsed <= today else "future"

    match = LEGACY.fullmatch(raw)
    if not match:
        return None, "unrecognized"
    day, month, year_raw = map(int, match.groups())
    years: list[int]
    if len(match.group(3)) == 4:
        years = [year_raw]
    else:
        years = [1900 + year_raw, 2000 + year_raw]

    candidates: list[dt.date] = []
    for year in years:
        try:
            candidate = dt.date(year, month, day)
        except ValueError:
            continue
        if dt.date(1900, 1, 1) <= candidate <= today:
            candidates.append(candidate)

    # A two-digit year is normalized only when the century is uniquely implied
    # by the 1900..today validity window. Otherwise manual review is required.
    unique = sorted(set(candidates))
    if len(unique) != 1:
        return None, "ambiguous" if unique else "invalid"
    return unique[0].isoformat(), "legacy_parseable"


def main() -> int:
    parser = argparse.ArgumentParser(description="Dry-run/apply conservative Lunar Birthright V4 normalization")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--timeout-ms", type=int, default=8000)
    args = parser.parse_args()

    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not mongo_url or not db_name:
        print("V4_MIGRATION_FAIL: MONGO_URL and DB_NAME must be configured", file=sys.stderr)
        return 2
    if db_name != "lunar_birthright":
        print("V4_MIGRATION_FAIL: DB_NAME must be exactly lunar_birthright", file=sys.stderr)
        return 2

    client = MongoClient(
        mongo_url,
        serverSelectionTimeoutMS=args.timeout_ms,
        connectTimeoutMS=args.timeout_ms,
        socketTimeoutMS=args.timeout_ms,
        appname="lunar-birthright-v4-normalization",
    )
    try:
        client.admin.command("ping")
        db = client[db_name]
        users = list(db.users.find({}))
        plots = list(db.plots.find({}))
        plot_by_id = {p.get("id"): p for p in plots}

        sector_ops: list[UpdateOne] = []
        birth_ops: list[UpdateOne] = []
        unresolved_birth_dates = 0
        today = dt.datetime.now(dt.timezone.utc).date()

        for user in users:
            plot = plot_by_id.get(user.get("plot_id"))
            if plot is not None and plot.get("lunar_sector") and user.get("lunar_sector") != plot.get("lunar_sector"):
                sector_ops.append(
                    UpdateOne(
                        {"_id": user.get("_id"), "plot_id": user.get("plot_id")},
                        {"$set": {"lunar_sector": plot.get("lunar_sector")}},
                    )
                )

            normalized, status = normalize_birth_date(user.get("birth_date"), today)
            if status == "legacy_parseable" and normalized != user.get("birth_date"):
                birth_ops.append(
                    UpdateOne(
                        {"_id": user.get("_id"), "birth_date": user.get("birth_date")},
                        {"$set": {"birth_date": normalized}},
                    )
                )
            elif status not in {"iso", "legacy_parseable"}:
                unresolved_birth_dates += 1

        report = {
            "database": db_name,
            "atlas_ping": "ok",
            "mode": "apply" if args.apply else "dry-run",
            "users_examined": len(users),
            "plots_examined": len(plots),
            "sector_updates_planned": len(sector_ops),
            "birth_date_updates_planned": len(birth_ops),
            "unresolved_birth_dates": unresolved_birth_dates,
            "protected_fields": [
                "plot ids", "plot owners", "plot coordinates", "historical payments",
                "certificate records", "NFT/token identifiers"
            ],
        }
        import json
        print(json.dumps(report, indent=2, sort_keys=True))

        if unresolved_birth_dates:
            print("V4_MIGRATION_BLOCKED: at least one birth date requires manual review; no writes performed", file=sys.stderr)
            return 3
        if not args.apply:
            print("V4_MIGRATION_DRY_RUN_OK")
            return 0

        if sector_ops:
            db.users.bulk_write(sector_ops, ordered=True)
        if birth_ops:
            db.users.bulk_write(birth_ops, ordered=True)

        # Verify only the two fields this migration is allowed to change.
        remaining_sector_mismatches = 0
        remaining_non_iso_birth_dates = 0
        for user in db.users.find({}):
            plot = plot_by_id.get(user.get("plot_id"))
            if plot is not None and plot.get("lunar_sector") and user.get("lunar_sector") != plot.get("lunar_sector"):
                remaining_sector_mismatches += 1
            normalized, status = normalize_birth_date(user.get("birth_date"), today)
            if status != "iso":
                remaining_non_iso_birth_dates += 1

        if remaining_sector_mismatches or remaining_non_iso_birth_dates:
            print(
                f"V4_MIGRATION_FAIL: verification sector={remaining_sector_mismatches} birth_date={remaining_non_iso_birth_dates}",
                file=sys.stderr,
            )
            return 4

        print("V4_MIGRATION_OK — permitted normalizations applied and verified")
        return 0
    except Exception as exc:
        print(f"V4_MIGRATION_FAIL: {type(exc).__name__}: {str(exc)[:300]}", file=sys.stderr)
        return 5
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
