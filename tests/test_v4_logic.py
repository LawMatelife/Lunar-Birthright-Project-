from __future__ import annotations

import datetime as dt
import unittest

from backend.birth_moon import calculate_birth_moon_profile
from scripts.migrate_v4_legacy import normalize_birth_date


class BirthMoonTests(unittest.TestCase):
    def test_profile_is_deterministic_for_same_date_and_seed(self):
        first = calculate_birth_moon_profile("2000-01-01", seed="citizen-001")
        second = calculate_birth_moon_profile("2000-01-01", seed="citizen-001")
        self.assertEqual(first, second)

    def test_seed_changes_symbolic_location_not_lunar_phase(self):
        first = calculate_birth_moon_profile("2000-01-01", seed="citizen-001")
        second = calculate_birth_moon_profile("2000-01-01", seed="citizen-002")
        self.assertEqual(first["phase_name"], second["phase_name"])
        self.assertEqual(first["birth_moon_region"], second["birth_moon_region"])
        self.assertNotEqual(
            (first["lunar_lat"], first["lunar_lon"], first["sector_code"]),
            (second["lunar_lat"], second["lunar_lon"], second["sector_code"]),
        )

    def test_coordinates_stay_in_declared_symbolic_bounds(self):
        profile = calculate_birth_moon_profile("1985-05-20", seed="founding-example")
        self.assertGreaterEqual(profile["lunar_lat"], -50.0)
        self.assertLessEqual(profile["lunar_lat"], 50.0)
        self.assertGreaterEqual(profile["lunar_lon"], -80.0)
        self.assertLessEqual(profile["lunar_lon"], 80.0)

    def test_invalid_dates_are_rejected(self):
        with self.assertRaises(ValueError):
            calculate_birth_moon_profile("1899-12-31", seed="x")
        tomorrow = dt.datetime.now(dt.timezone.utc).date() + dt.timedelta(days=1)
        with self.assertRaises(ValueError):
            calculate_birth_moon_profile(tomorrow.isoformat(), seed="x")


class LegacyDateTests(unittest.TestCase):
    def setUp(self):
        self.today = dt.date(2026, 8, 23)

    def test_iso_date_is_preserved(self):
        value, status = normalize_birth_date("1985-05-20", self.today)
        self.assertEqual(value, "1985-05-20")
        self.assertEqual(status, "iso")

    def test_unambiguous_four_digit_legacy_date_is_normalized(self):
        value, status = normalize_birth_date("20/05/1985", self.today)
        self.assertEqual(value, "1985-05-20")
        self.assertEqual(status, "legacy_parseable")

    def test_ambiguous_two_digit_year_is_blocked(self):
        value, status = normalize_birth_date("01/01/20", self.today)
        self.assertIsNone(value)
        self.assertEqual(status, "ambiguous")

    def test_future_date_is_blocked(self):
        value, status = normalize_birth_date("01/01/2030", self.today)
        self.assertIsNone(value)
        self.assertEqual(status, "invalid")


if __name__ == "__main__":
    unittest.main()
