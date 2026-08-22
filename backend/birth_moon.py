"""Birth Moon calculations for Lunar Birthright.

The astronomical phase calculation is an approximation based on a known new-moon
reference and the mean synodic month. The surface location is intentionally a
symbolic, deterministic registry location anchored to the phase band; it is not
an astronomical sub-Earth/sub-solar point and is never represented as legal
ownership of lunar land.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
import hashlib
import math

SYNODIC_MONTH_DAYS = 29.530588853
REFERENCE_NEW_MOON = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)

# Near-side symbolic anchors. Coordinates are used only to create a coherent
# phase-linked visual region on the globe; final plot coordinates are offset
# deterministically within a small band around the anchor.
_PHASE_ANCHORS = (
    ("New Moon", "Mare Crisium", 17.0, 59.0),
    ("Waxing Crescent", "Mare Fecunditatis", -7.8, 51.3),
    ("First Quarter", "Mare Tranquillitatis", 8.5, 31.4),
    ("Waxing Gibbous", "Mare Serenitatis", 28.0, 17.5),
    ("Full Moon", "Mare Imbrium", 32.8, -15.6),
    ("Waning Gibbous", "Oceanus Procellarum", 18.4, -57.4),
    ("Last Quarter", "Mare Nubium", -21.3, -16.6),
    ("Waning Crescent", "Mare Humorum", -24.4, -38.6),
)


def _parse_birth_date(value: str) -> date:
    try:
        parsed = datetime.strptime((value or "").strip(), "%Y-%m-%d").date()
    except (TypeError, ValueError) as exc:
        raise ValueError("Birth date must be in YYYY-MM-DD format") from exc
    if parsed > datetime.now(timezone.utc).date():
        raise ValueError("Birth date cannot be in the future")
    if parsed.year < 1900:
        raise ValueError("Birth date must be 1900 or later")
    return parsed


def calculate_birth_moon_profile(birth_date: str, seed: str = "preview") -> dict:
    """Return an approximate lunar phase plus a deterministic symbolic plot region."""
    parsed = _parse_birth_date(birth_date)
    birth_dt = datetime(parsed.year, parsed.month, parsed.day, 12, 0, tzinfo=timezone.utc)
    days_since_reference = (birth_dt - REFERENCE_NEW_MOON).total_seconds() / 86400.0
    lunar_age = days_since_reference % SYNODIC_MONTH_DAYS
    phase_fraction = lunar_age / SYNODIC_MONTH_DAYS
    illumination = (1.0 - math.cos(2.0 * math.pi * phase_fraction)) / 2.0 * 100.0

    # Eight equal phase sectors, centred on the conventional phase names.
    phase_index = int(math.floor((phase_fraction * 8.0) + 0.5)) % 8
    phase_name, region, anchor_lat, anchor_lon = _PHASE_ANCHORS[phase_index]

    digest = hashlib.sha256(f"{parsed.isoformat()}|{seed}".encode("utf-8")).digest()
    lat_unit = int.from_bytes(digest[0:4], "big") / 0xFFFFFFFF
    lon_unit = int.from_bytes(digest[4:8], "big") / 0xFFFFFFFF
    sector_num = int.from_bytes(digest[8:12], "big") % 9000 + 1000
    sector_letter = chr(ord("A") + (digest[12] % 12))

    lunar_lat = max(-50.0, min(50.0, anchor_lat + (lat_unit - 0.5) * 8.0))
    lunar_lon = max(-80.0, min(80.0, anchor_lon + (lon_unit - 0.5) * 10.0))

    return {
        "birth_date": parsed.isoformat(),
        "phase_name": phase_name,
        "phase_fraction": round(phase_fraction, 6),
        "illumination_percent": round(illumination, 1),
        "lunar_age_days": round(lunar_age, 2),
        "birth_moon_region": region,
        "lunar_lat": round(lunar_lat, 6),
        "lunar_lon": round(lunar_lon, 6),
        "sector_code": f"{sector_letter}-{sector_num}",
        "method": "Approximate phase from mean synodic month; symbolic phase-linked registry location",
    }
