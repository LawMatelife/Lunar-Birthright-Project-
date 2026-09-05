#!/usr/bin/env python3
"""Read-only reconciliation of Lunar browser claim recovery data vs Emergent baseline.

Inputs:
  1. Emergent JSON export ZIP (users.json, plots.json, certificates.json,
     payment_transactions.json)
  2. JSON produced by browser_claim_state_export.js

This script performs NO database writes. It extracts claim-like objects from the
browser evidence, normalizes common field aliases, and classifies them as:
  - existing: stable identifier matches a baseline record
  - new_candidate: enough identity/claim evidence exists and no stable match exists
  - ambiguous: conflicting baseline matches or duplicate candidate evidence
  - insufficient: not enough structured claim data to establish a record

Matching deliberately prioritizes stable identifiers over names.
"""
from __future__ import annotations

import argparse
import hashlib
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
    "email": {"email", "email_address", "emailAddress"},
    "user_id": {"user_id", "userId", "account_id", "accountId", "owner_id", "ownerId"},
    "plot_id": {"plot_id", "plotId", "claim_id", "claimId"},
    "certificate_id": {"certificate_id", "certificateId", "cert_id", "certId"},
    "citizen_number": {"citizen_number", "citizenNumber", "citizen_no", "citizenNo"},
    "name": {"name", "full_name", "fullName", "recipient_name", "recipientName"},
    "birth_date": {"birth_date", "birthDate", "dob", "date_of_birth", "dateOfBirth"},
    "country": {"country", "country_code", "countryCode"},
    "lunar_lat": {"lunar_lat", "lunarLat", "latitude", "lat"},
    "lunar_lon": {"lunar_lon", "lunarLon", "longitude", "lon", "lng"},
    "lunar_sector": {"lunar_sector", "lunarSector", "sector"},
}
SECRET = re.compile(r"password|passwd|secret|token|jwt|stripe|api.?key|authorization|bearer", re.I)


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def norm_email(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    return value if "@" in value else None


def norm_scalar(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (str, int, float)):
        text = str(value).strip()
        return text or None
    return None


def canonicalize(obj: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for canonical, names in ALIASES.items():
        for name in names:
            if name in obj and obj[name] not in (None, "", [], {}):
                out[canonical] = obj[name]
                break
    if "email" in out:
        out["email"] = norm_email(out["email"])
    for key in ("user_id", "plot_id", "certificate_id", "citizen_number", "name", "birth_date", "country", "lunar_sector"):
        if key in out:
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
        data = {}
        for logical, filename in FILES.items():
            value = json.loads(zf.read(filename))
            if not isinstance(value, list):
                raise ValueError(f"{filename} must contain a JSON array")
            data[logical] = value
        return data


def indexes(base: dict[str, list[dict[str, Any]]]) -> dict[str, dict[str, set[str]]]:
    idx = {"email": {}, "user_id": {}, "plot_id": {}, "certificate_id": {}, "citizen_number": {}}

    def add(kind: str, value: Any, marker: str) -> None:
        scalar = norm_email(value) if kind == "email" else norm_scalar(value)
        if scalar:
            idx[kind].setdefault(scalar, set()).add(marker)

    for user in base["users"]:
        marker = f"user:{user.get('id')}"
        add("email", user.get("email"), marker)
        add("user_id", user.get("id"), marker)
        add("plot_id", user.get("plot_id"), marker)
        add("citizen_number", user.get("citizen_number") or user.get("citizen_no"), marker)
    for plot in base["plots"]:
        marker = f"plot:{plot.get('id')}"
        add("plot_id", plot.get("id"), marker)
        add("user_id", plot.get("owner_id"), marker)
    for cert in base["certificates"]:
        marker = f"cert:{cert.get('id')}"
        add("certificate_id", cert.get("id"), marker)
        add("certificate_id", cert.get("certificate_id"), marker)
        add("user_id", cert.get("user_id"), marker)
        add("plot_id", cert.get("plot_id"), marker)
        add("citizen_number", cert.get("citizen_number") or cert.get("citizen_no"), marker)
    return idx


def redact_obj(obj: dict[str, Any]) -> dict[str, Any]:
    return {k: ("[REDACTED]" if SECRET.search(k) else v) for k, v in obj.items()}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline_zip", type=Path)
    parser.add_argument("browser_json", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    base = load_baseline(args.baseline_zip)
    idx = indexes(base)
    evidence = json.loads(args.browser_json.read_text(encoding="utf-8"))

    raw_entries = []
    for storage_name in ("localStorage", "sessionStorage"):
        for entry in evidence.get("storage", {}).get(storage_name, []):
            if not isinstance(entry, dict) or "value" not in entry:
                continue
            raw_entries.append((storage_name, entry.get("key"), entry["value"]))

    candidates = []
    seen_fingerprints: set[str] = set()
    for storage_name, storage_key, value in raw_entries:
        for obj in walk(value):
            canon = canonicalize(obj)
            stable_present = any(canon.get(k) for k in ("user_id", "plot_id", "certificate_id", "citizen_number"))
            supporting = sum(bool(canon.get(k)) for k in ("name", "birth_date", "country", "lunar_lat", "lunar_lon", "lunar_sector"))
            if not stable_present and not (canon.get("email") and supporting >= 1):
                continue

            fingerprint_material = json.dumps(canon, sort_keys=True, default=str)
            fp = sha(fingerprint_material)
            if fp in seen_fingerprints:
                continue
            seen_fingerprints.add(fp)

            matched_markers: set[str] = set()
            matched_by = []
            for kind in ("email", "user_id", "plot_id", "certificate_id", "citizen_number"):
                value_ = canon.get(kind)
                if not value_:
                    continue
                key = norm_email(value_) if kind == "email" else norm_scalar(value_)
                hits = idx[kind].get(key or "", set())
                if hits:
                    matched_markers.update(hits)
                    matched_by.append(kind)

            user_roots = set()
            for marker in matched_markers:
                if marker.startswith("user:"):
                    user_roots.add(marker)
                elif marker.startswith("plot:"):
                    plot_id = marker.split(":", 1)[1]
                    plot = next((p for p in base["plots"] if str(p.get("id")) == plot_id), None)
                    if plot and plot.get("owner_id") is not None:
                        user_roots.add(f"user:{plot.get('owner_id')}")
                elif marker.startswith("cert:"):
                    cert_id = marker.split(":", 1)[1]
                    cert = next((c for c in base["certificates"] if str(c.get("id")) == cert_id), None)
                    if cert and cert.get("user_id") is not None:
                        user_roots.add(f"user:{cert.get('user_id')}")

            if len(user_roots) > 1:
                status = "ambiguous"
            elif matched_markers:
                status = "existing"
            elif stable_present or (canon.get("email") and supporting >= 2):
                status = "new_candidate"
            else:
                status = "insufficient"

            candidates.append({
                "fingerprint": fp,
                "status": status,
                "source_storage": storage_name,
                "source_key": storage_key,
                "matched_by": matched_by,
                "matched_baseline_markers": sorted(matched_markers),
                "record": redact_obj(canon),
            })

    summary = {
        "baseline_counts": {k: len(v) for k, v in base.items()},
        "browser_origin": evidence.get("origin"),
        "browser_exported_at": evidence.get("exported_at"),
        "candidate_counts": {
            status: sum(c["status"] == status for c in candidates)
            for status in ("existing", "new_candidate", "ambiguous", "insufficient")
        },
        "candidates": candidates,
        "writes_performed": 0,
    }

    text = json.dumps(summary, indent=2, sort_keys=True, default=str)
    print(text)
    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
        print(f"RECONCILIATION_REPORT_WRITTEN {args.output}")
    print("BROWSER_RECONCILIATION_READ_ONLY_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
