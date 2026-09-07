#!/usr/bin/env python3
"""Reconcile an authenticated Lunar admin persistence probe against an Emergent export.

This tool is deliberately read-only. It performs no database writes and does not
change the source export or admin evidence. Matching prioritises stable IDs and
normalised email addresses; names alone never establish a duplicate.

Inputs:
  baseline_zip   Emergent ZIP containing users.json, plots.json,
                 certificates.json and payment_transactions.json
  admin_probe    JSON produced by admin_persistence_probe_bookmarklet.txt

The console output contains counts only. Use --output to write a private local
report containing the recovered claimant fields needed for migration review.
"""
from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from typing import Any, Iterable

FILES = {
    "users": "users.json",
    "plots": "plots.json",
    "certificates": "certificates.json",
    "payments": "payment_transactions.json",
}

ALIASES = {
    "user_id": ("id", "user_id", "userId", "account_id", "accountId", "owner_id", "ownerId"),
    "email": ("email", "email_address", "emailAddress"),
    "name": ("full_name", "fullName", "name", "claimant_name", "claimantName", "recipient_name", "recipientName"),
    "country": ("country", "country_code", "countryCode"),
    "birth_date": ("birth_date", "birthDate", "dob", "date_of_birth", "dateOfBirth"),
    "plot_id": ("plot_id", "plotId", "claim_id", "claimId"),
    "certificate_id": ("certificate_id", "certificateId", "cert_id", "certId"),
    "certificate_number": ("certificate_number", "certificateNumber", "cert_number", "certNumber"),
    "citizen_number": ("citizen_number", "citizenNumber", "citizen_no", "citizenNo"),
    "created_at": ("created_at", "createdAt", "claimed_at", "claimedAt"),
}

SECRET = re.compile(r"password|passwd|secret|jwt|stripe|api.?key|authorization|bearer|cookie|session.?token|refresh.?token|access.?token", re.I)
PREFERRED_ENDPOINTS = (
    "/api/admin/users-detailed",
    "/api/admin/registry-audit",
    "/api/admin/users",
    "/admin/users-detailed",
    "/admin/users",
)


def norm_scalar(value: Any) -> str | None:
    if value is None or isinstance(value, (dict, list)):
        return None
    text = str(value).strip()
    return text or None


def norm_email(value: Any) -> str | None:
    text = norm_scalar(value)
    if not text or "@" not in text:
        return None
    return text.lower()


def canonicalize(obj: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for canonical, aliases in ALIASES.items():
        for alias in aliases:
            if alias in obj and obj[alias] not in (None, "", [], {}):
                out[canonical] = obj[alias]
                break
    if "email" in out:
        out["email"] = norm_email(out["email"])
    for key in tuple(out):
        if key != "email":
            out[key] = norm_scalar(out[key])
    return {k: v for k, v in out.items() if v is not None}


def walk(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def load_baseline(path: Path) -> dict[str, list[dict[str, Any]]]:
    with zipfile.ZipFile(path) as zf:
        out: dict[str, list[dict[str, Any]]] = {}
        for logical, filename in FILES.items():
            value = json.loads(zf.read(filename))
            if not isinstance(value, list):
                raise ValueError(f"{filename} must contain a JSON array")
            out[logical] = value
        return out


def baseline_indexes(base: dict[str, list[dict[str, Any]]]) -> dict[str, dict[str, set[str]]]:
    idx = {k: {} for k in ("user_id", "email", "plot_id", "certificate_id", "certificate_number", "citizen_number")}

    def add(kind: str, value: Any, user_marker: str) -> None:
        key = norm_email(value) if kind == "email" else norm_scalar(value)
        if key:
            idx[kind].setdefault(key, set()).add(user_marker)

    for user in base["users"]:
        marker = f"user:{user.get('id')}"
        add("user_id", user.get("id"), marker)
        add("email", user.get("email"), marker)
        add("plot_id", user.get("plot_id"), marker)
        add("citizen_number", user.get("citizen_number") or user.get("citizen_no"), marker)

    plot_owner: dict[str, str] = {}
    for plot in base["plots"]:
        pid = norm_scalar(plot.get("id"))
        owner = norm_scalar(plot.get("owner_id") or plot.get("user_id"))
        if pid and owner:
            plot_owner[pid] = owner
            add("plot_id", pid, f"user:{owner}")

    for cert in base["certificates"]:
        owner = norm_scalar(cert.get("user_id") or cert.get("owner_id"))
        if not owner:
            pid = norm_scalar(cert.get("plot_id"))
            owner = plot_owner.get(pid or "")
        if not owner:
            continue
        marker = f"user:{owner}"
        add("certificate_id", cert.get("id") or cert.get("certificate_id"), marker)
        add("certificate_number", cert.get("certificate_number") or cert.get("cert_number"), marker)
        add("citizen_number", cert.get("citizen_number") or cert.get("citizen_no"), marker)
        add("plot_id", cert.get("plot_id"), marker)
    return idx


def endpoint_priority(url: str) -> int:
    for i, marker in enumerate(PREFERRED_ENDPOINTS):
        if marker in url:
            return i
    return 99


def extract_admin_records(probe: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    endpoints = [e for e in probe.get("endpoints", []) if isinstance(e, dict) and e.get("ok")]
    endpoints.sort(key=lambda e: endpoint_priority(str(e.get("url", ""))))

    records: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []
    seen: set[tuple[str, ...]] = set()

    for endpoint in endpoints:
        url = str(endpoint.get("url", ""))
        if endpoint_priority(url) == 99:
            continue
        body = endpoint.get("body")
        found_here = 0
        for obj in walk(body):
            canon = canonicalize(obj)
            identity_count = sum(bool(canon.get(k)) for k in (
                "user_id", "email", "plot_id", "certificate_id", "certificate_number", "citizen_number"
            ))
            supporting_count = sum(bool(canon.get(k)) for k in ("name", "country", "birth_date", "created_at"))
            if identity_count < 1 or supporting_count < 1:
                continue
            fingerprint = tuple(str(canon.get(k, "")) for k in sorted(canon))
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            canon["_source_endpoint"] = url
            records.append(canon)
            found_here += 1
        sources.append({"url": url, "status": endpoint.get("status"), "records_found": found_here})
        if found_here >= 20:
            # A detailed admin endpoint normally contains the full registry.
            # Avoid double-counting the same rows from lower-priority endpoints.
            break
    return records, sources


def classify(record: dict[str, Any], idx: dict[str, dict[str, set[str]]]) -> tuple[str, list[str], list[str]]:
    matched_users: set[str] = set()
    matched_by: list[str] = []
    for kind in ("user_id", "email", "plot_id", "certificate_id", "certificate_number", "citizen_number"):
        value = record.get(kind)
        if not value:
            continue
        key = norm_email(value) if kind == "email" else norm_scalar(value)
        hits = idx[kind].get(key or "", set())
        if hits:
            matched_users.update(hits)
            matched_by.append(kind)
    if len(matched_users) > 1:
        return "ambiguous", matched_by, sorted(matched_users)
    if len(matched_users) == 1:
        return "existing", matched_by, sorted(matched_users)
    stable = any(record.get(k) for k in ("user_id", "plot_id", "certificate_id", "certificate_number", "citizen_number"))
    enough_identity = bool(record.get("email") and record.get("name"))
    if stable or enough_identity:
        return "new_candidate", [], []
    return "insufficient", [], []


def scrub(value: Any) -> Any:
    if isinstance(value, list):
        return [scrub(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            out[key] = "[REDACTED]" if SECRET.search(str(key)) else scrub(item)
        return out
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline_zip", type=Path)
    parser.add_argument("admin_probe", type=Path)
    parser.add_argument("--output", type=Path, help="Private reconciliation JSON; contains claimant fields, not credentials")
    args = parser.parse_args()

    base = load_baseline(args.baseline_zip)
    probe = json.loads(args.admin_probe.read_text(encoding="utf-8"))
    if probe.get("kind") != "lunar_birthright_admin_persistence_probe":
        raise ValueError("Input is not a Lunar admin persistence probe JSON")

    records, sources = extract_admin_records(probe)
    idx = baseline_indexes(base)
    results = []
    for record in records:
        status, matched_by, matched_users = classify(record, idx)
        results.append({
            "status": status,
            "matched_by": matched_by,
            "matched_baseline_users": matched_users,
            "record": scrub(record),
        })

    counts = {name: sum(r["status"] == name for r in results) for name in ("existing", "new_candidate", "ambiguous", "insufficient")}
    summary = {
        "baseline_counts": {k: len(v) for k, v in base.items()},
        "probe_origin": probe.get("origin"),
        "probe_exported_at": probe.get("exported_at"),
        "admin_records_recovered": len(records),
        "classification_counts": counts,
        "sources": sources,
        "writes_performed": 0,
    }

    print(json.dumps(summary, indent=2, sort_keys=True))
    print("ADMIN_PROBE_RECONCILIATION_READ_ONLY_OK")

    if args.output:
        private_report = dict(summary)
        private_report["records"] = results
        args.output.write_text(json.dumps(private_report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"PRIVATE_RECONCILIATION_REPORT_WRITTEN {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
