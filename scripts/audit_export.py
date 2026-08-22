#!/usr/bin/env python3
"""Audit a Lunar Birthright JSON database-export ZIP without exposing PII.

The script is read-only. It reports counts, cryptographic hashes and integrity
statistics, but never prints names, email addresses, birth dates, passwords or
record identifiers. It is intended to be run on every fresh pre-cutover export.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import sys
import zipfile
from pathlib import Path

REQUIRED_FILES = {
    "users": "users.json",
    "plots": "plots.json",
    "certificates": "certificates.json",
    "payments": "payment_transactions.json",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_expectation(raw: str) -> tuple[str, int]:
    if "=" not in raw:
        raise argparse.ArgumentTypeError("expected COLLECTION=COUNT")
    name, count = raw.split("=", 1)
    name = name.strip()
    try:
        value = int(count)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("COUNT must be an integer") from exc
    if name not in REQUIRED_FILES:
        raise argparse.ArgumentTypeError(f"COLLECTION must be one of: {', '.join(REQUIRED_FILES)}")
    return name, value


def unique(values) -> bool:
    values = list(values)
    return len(values) == len(set(values))


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only Lunar Birthright export integrity audit")
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("--expect", action="append", default=[], type=parse_expectation,
                        metavar="COLLECTION=COUNT")
    parser.add_argument("--manifest", type=Path, default=None,
                        help="write the PII-free audit report as JSON")
    args = parser.parse_args()

    if not args.zip_path.is_file():
        print("EXPORT_AUDIT_FAIL: ZIP not found", file=sys.stderr)
        return 2

    raw_zip = args.zip_path.read_bytes()
    try:
        zf = zipfile.ZipFile(args.zip_path)
    except zipfile.BadZipFile:
        print("EXPORT_AUDIT_FAIL: invalid ZIP", file=sys.stderr)
        return 2

    missing = [filename for filename in REQUIRED_FILES.values() if filename not in zf.namelist()]
    if missing:
        print(f"EXPORT_AUDIT_FAIL: required files missing: {', '.join(missing)}", file=sys.stderr)
        return 2

    collections_data = {}
    file_hashes = {}
    for logical, filename in REQUIRED_FILES.items():
        raw = zf.read(filename)
        file_hashes[filename] = sha256(raw)
        value = json.loads(raw)
        if not isinstance(value, list):
            print(f"EXPORT_AUDIT_FAIL: {filename} is not a JSON array", file=sys.stderr)
            return 2
        collections_data[logical] = value

    users = collections_data["users"]
    plots = collections_data["plots"]
    certificates = collections_data["certificates"]
    payments = collections_data["payments"]

    user_by_id = {u.get("id"): u for u in users}
    plot_by_id = {p.get("id"): p for p in plots}
    payment_by_session = {p.get("session_id"): p for p in payments}

    critical = {}
    critical["duplicate_user_ids"] = not unique(u.get("id") for u in users)
    critical["duplicate_plot_ids"] = not unique(p.get("id") for p in plots)
    critical["duplicate_certificate_ids"] = not unique(c.get("id") for c in certificates)
    critical["duplicate_payment_ids"] = not unique(p.get("id") for p in payments)
    critical["duplicate_emails"] = not unique((u.get("email") or "").strip().lower() for u in users)
    critical["duplicate_plot_coordinates"] = not unique((p.get("lunar_lat"), p.get("lunar_lon")) for p in plots)

    relation_counts = collections.Counter()
    for user in users:
        plot = plot_by_id.get(user.get("plot_id"))
        if plot is None:
            relation_counts["user_missing_plot"] += 1
        elif plot.get("owner_id") != user.get("id"):
            relation_counts["user_plot_owner_mismatch"] += 1
    for plot in plots:
        user = user_by_id.get(plot.get("owner_id"))
        if user is None:
            relation_counts["plot_missing_owner"] += 1
        elif user.get("plot_id") != plot.get("id"):
            relation_counts["plot_user_reverse_mismatch"] += 1
    for cert in certificates:
        if cert.get("user_id") not in user_by_id:
            relation_counts["certificate_missing_user"] += 1
        if cert.get("plot_id") not in plot_by_id:
            relation_counts["certificate_missing_plot"] += 1
        payment = payment_by_session.get(cert.get("stripe_session_id"))
        if payment is None:
            relation_counts["certificate_missing_payment_session"] += 1
        else:
            if payment.get("user_id") != cert.get("user_id"):
                relation_counts["certificate_payment_user_mismatch"] += 1
            if float(payment.get("amount") or 0) != float(cert.get("amount_paid") or 0):
                relation_counts["certificate_payment_amount_mismatch"] += 1

    # Legacy observations are not automatically destructive errors. They are
    # recorded so a V4 migration can handle them deliberately after exact restore.
    sector_mismatches = 0
    for user in users:
        plot = plot_by_id.get(user.get("plot_id"))
        if plot and user.get("lunar_sector") != plot.get("lunar_sector"):
            sector_mismatches += 1

    non_iso_birth_dates = 0
    for user in users:
        value = user.get("birth_date")
        try:
            dt.datetime.strptime(value or "", "%Y-%m-%d")
        except ValueError:
            non_iso_birth_dates += 1

    status_mismatches = 0
    for cert in certificates:
        payment = payment_by_session.get(cert.get("stripe_session_id"))
        if payment and payment.get("payment_status") != cert.get("payment_status"):
            status_mismatches += 1

    expected = dict(args.expect)
    counts = {name: len(value) for name, value in collections_data.items()}
    expectation_mismatches = {
        name: {"expected": wanted, "actual": counts[name]}
        for name, wanted in expected.items() if counts[name] != wanted
    }

    report = {
        "source_file": args.zip_path.name,
        "zip_size_bytes": len(raw_zip),
        "zip_sha256": sha256(raw_zip),
        "file_sha256": file_hashes,
        "counts": counts,
        "expected": expected,
        "expectation_mismatches": expectation_mismatches,
        "critical_integrity": {
            **critical,
            "relationship_issue_counts": dict(sorted(relation_counts.items())),
        },
        "legacy_observations": {
            "user_plot_lunar_sector_mismatches": sector_mismatches,
            "non_iso_birth_dates": non_iso_birth_dates,
            "certificate_payment_status_vocabulary_mismatches": status_mismatches,
            "payment_currencies": dict(collections.Counter(str(p.get("currency")) for p in payments)),
            "payment_amounts": dict(collections.Counter(str(p.get("amount")) for p in payments)),
            "payment_statuses": dict(collections.Counter(str(p.get("payment_status")) for p in payments)),
            "certificate_payment_statuses": dict(collections.Counter(str(c.get("payment_status")) for c in certificates)),
            "nft_minted_true": sum(c.get("nft_minted") is True for c in certificates),
        },
    }

    print(json.dumps(report, indent=2, sort_keys=True))
    if args.manifest:
        args.manifest.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"EXPORT_AUDIT_MANIFEST_WRITTEN {args.manifest}")

    has_critical = any(bool(v) for k, v in critical.items()) or bool(relation_counts)
    if has_critical or expectation_mismatches:
        print("EXPORT_AUDIT_FAIL", file=sys.stderr)
        return 1

    print("EXPORT_AUDIT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
