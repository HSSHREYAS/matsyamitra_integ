"""
INCOIS Scraper — Unit Tests.

Tests cover:
  - Parser: mock advisory HTML → correct records extracted
  - Parser: "no advisory" pages → empty list returned
  - Spatial: Haversine distance correctness
  - Spatial: nearest KARN point matching within threshold
  - Spatial: out-of-range coordinates → None returned
  - Repository: insert + skip duplicates (SQLite in-memory)
  - Pipeline: end-to-end with HTML override (no browser required)

Run with:
    python -m pytest analytics/incois/tests.py -v
    # or
    python -m unittest analytics.incois.tests -v
"""

from __future__ import annotations

import unittest
from datetime import date, datetime, timezone
from typing import Optional
from unittest.mock import MagicMock, patch

# ── Parser Tests ──────────────────────────────────────────────────────────────

MOCK_ADVISORY_HTML = """
<html><body>
<table>
  <thead>
    <tr>
      <th>Landing Center</th>
      <th>Bearing (°)</th>
      <th>Distance (km)</th>
      <th>Depth (m)</th>
      <th>Latitude</th>
      <th>Longitude</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Karwar</td>
      <td>235</td>
      <td>45</td>
      <td>80</td>
      <td>14.50</td>
      <td>73.25</td>
    </tr>
    <tr>
      <td>Malpe</td>
      <td>270</td>
      <td>60</td>
      <td>120</td>
      <td>13.35</td>
      <td>74.60</td>
    </tr>
    <tr>
      <td>Mangalore</td>
      <td>190</td>
      <td>30</td>
      <td>60</td>
      <td>12.87</td>
      <td>74.82</td>
    </tr>
  </tbody>
</table>
</body></html>
"""

MOCK_LIVE_ADVISORY_HTML = """
<html><body>
<table>
  <tr>
    <th>From the coast of</th>
    <th>Direction</th>
    <th>Bearing (deg)</th>
    <th>Distance (km) From-To</th>
    <th>Depth (mtr) From-To</th>
    <th>Latitude (dms)</th>
    <th>Longitude (dms)</th>
  </tr>
  <tr>
    <td>Karwar</td>
    <td>NW</td>
    <td>273</td>
    <td>21-26</td>
    <td>39-44</td>
    <td>14 49 58 N</td>
    <td>73 50 45 E</td>
  </tr>
</table>
</body></html>
"""

MOCK_NO_ADVISORY_HTML = """
<html><body>
<div id="incois-content">
  <h2>Marine Fishery Advisories</h2>
  <p>No advisory issued today due to trawling ban.</p>
</div>
</body></html>
"""

MOCK_EMPTY_PAGE_HTML = """
<html><body>
<div id="incois-content">
  <h2>Background</h2>
  <p>Some background text only.</p>
</div>
</body></html>
"""


class TestParser(unittest.TestCase):

    def setUp(self):
        from analytics.incois.parser import parse_advisory_html
        self.parse = parse_advisory_html
        self.today = date(2026, 8, 14)

    def test_parses_advisory_table(self):
        records = self.parse(MOCK_ADVISORY_HTML, advisory_date=self.today)
        self.assertEqual(len(records), 3)

    def test_record_fields_karwar(self):
        records = self.parse(MOCK_ADVISORY_HTML, advisory_date=self.today)
        karwar = next(r for r in records if r.landing_center == "Karwar")
        self.assertAlmostEqual(karwar.latitude, 14.50, places=2)
        self.assertAlmostEqual(karwar.longitude, 73.25, places=2)
        self.assertAlmostEqual(karwar.bearing_degrees, 235.0, places=1)
        self.assertAlmostEqual(karwar.distance_km, 45.0, places=1)
        self.assertAlmostEqual(karwar.depth_m, 80.0, places=1)

    def test_parses_live_table_format(self):
        records = self.parse(MOCK_LIVE_ADVISORY_HTML, advisory_date=self.today)
        self.assertEqual(len(records), 1)
        karwar = records[0]
        self.assertAlmostEqual(karwar.latitude, 14.832777, places=5)
        self.assertAlmostEqual(karwar.longitude, 73.845833, places=5)
        self.assertAlmostEqual(karwar.bearing_degrees, 273.0, places=1)
        self.assertAlmostEqual(karwar.distance_km, 23.5, places=1)
        self.assertAlmostEqual(karwar.depth_m, 41.5, places=1)

    def test_advisory_date_stamped(self):
        records = self.parse(MOCK_ADVISORY_HTML, advisory_date=self.today)
        for rec in records:
            self.assertEqual(rec.advisory_date, self.today)

    def test_no_advisory_page_returns_empty(self):
        records = self.parse(MOCK_NO_ADVISORY_HTML, advisory_date=self.today)
        self.assertEqual(len(records), 0)

    def test_empty_page_returns_empty(self):
        records = self.parse(MOCK_EMPTY_PAGE_HTML, advisory_date=self.today)
        self.assertEqual(len(records), 0)

    def test_empty_html_returns_empty(self):
        records = self.parse("", advisory_date=self.today)
        self.assertEqual(len(records), 0)

    def test_raw_text_populated(self):
        records = self.parse(MOCK_ADVISORY_HTML, advisory_date=self.today)
        for rec in records:
            self.assertIsInstance(rec.raw_row_text, str)
            self.assertGreater(len(rec.raw_row_text), 0)

    def test_out_of_bounds_coordinates_skipped(self):
        """Coordinates outside Karnataka coast (10-20°N, 70-80°E) are skipped."""
        html = """
        <html><body><table>
          <tr><th>Landing Center</th><th>Latitude</th><th>Longitude</th></tr>
          <tr><td>Fake</td><td>50.0</td><td>10.0</td></tr>
        </table></body></html>
        """
        records = self.parse(html, advisory_date=self.today)
        self.assertEqual(len(records), 0)


# ── Spatial Tests ─────────────────────────────────────────────────────────────

class TestSpatial(unittest.TestCase):

    def setUp(self):
        from analytics.incois.spatial import (
            haversine_km,
            find_nearest_sampling_location,
            get_canonical_locations,
        )
        self.haversine_km = haversine_km
        self.find_nearest = find_nearest_sampling_location
        self.get_locations = get_canonical_locations

    def test_haversine_same_point_is_zero(self):
        dist = self.haversine_km(13.5, 74.0, 13.5, 74.0)
        self.assertAlmostEqual(dist, 0.0, places=5)

    def test_haversine_known_distance(self):
        # Mangalore (12.87°N, 74.84°E) to Karwar (14.81°N, 74.13°E) ≈ 230 km
        dist = self.haversine_km(12.87, 74.84, 14.81, 74.13)
        self.assertGreater(dist, 200)
        self.assertLess(dist, 260)

    def test_canonical_locations_loaded(self):
        locations = self.get_locations()
        self.assertEqual(len(locations), 25)

    def test_karn_ids_are_unique(self):
        locations = self.get_locations()
        ids = [loc.location_id for loc in locations]
        self.assertEqual(len(ids), len(set(ids)))

    def test_finds_match_within_threshold(self):
        # KARN_005 is at (12.656436, 74.245355) — test nearby point
        result = self.find_nearest(12.65, 74.25, max_distance_km=75.0)
        self.assertIsNotNone(result)
        self.assertLess(result.distance_km, 75.0)

    def test_returns_none_beyond_threshold(self):
        # Far-off coordinate (Mumbai area, ~900 km from Karnataka)
        result = self.find_nearest(19.0, 73.0, max_distance_km=75.0)
        self.assertIsNone(result)

    def test_all_karn_points_match_themselves(self):
        """Each canonical KARN point should match itself with distance ≈ 0."""
        locations = self.get_locations()
        for loc in locations:
            result = self.find_nearest(loc.latitude, loc.longitude)
            self.assertIsNotNone(result)
            self.assertEqual(result.location_id, loc.location_id)
            self.assertAlmostEqual(result.distance_km, 0.0, places=3)


# ── Pipeline Tests (no browser) ───────────────────────────────────────────────

class TestPipeline(unittest.TestCase):

    def test_pipeline_with_html_override_no_advisory(self):
        """Pipeline with 'no advisory' HTML should return gracefully."""
        mock_session = MagicMock()
        mock_session.scalar.return_value = None  # no existing record

        from analytics.incois.pipeline import run_incois_pipeline

        result = run_incois_pipeline(
            session=mock_session,
            sector_id="SEC004",
            advisory_date=date(2026, 8, 14),
            html_override=MOCK_NO_ADVISORY_HTML,
        )

        self.assertTrue(result.scrape_success)
        self.assertTrue(result.no_advisory_today)
        self.assertEqual(result.records_parsed, 0)
        self.assertEqual(result.records_inserted, 0)

    def test_pipeline_scrape_failure_returns_error(self):
        """Pipeline should record error when scraper returns None."""
        mock_session = MagicMock()

        with patch("analytics.incois.pipeline.scrape_incois_advisory", return_value=None):
            from analytics.incois.pipeline import run_incois_pipeline
            result = run_incois_pipeline(
                session=mock_session,
                sector_id="SEC004",
                advisory_date=date(2026, 8, 14),
            )

        self.assertFalse(result.scrape_success)
        self.assertGreater(len(result.errors), 0)


# ── Repository Tests (SQLite in-memory) ───────────────────────────────────────

class TestRepository(unittest.TestCase):

    def setUp(self):
        """Set up SQLite in-memory DB with the incois_advisories table."""
        from sqlalchemy import create_engine
        from analytics.persistence.models import Base

        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(self.engine)

        from sqlalchemy.orm import Session as SASession
        self.session = SASession(self.engine)

    def tearDown(self):
        self.session.close()

    def test_insert_advisory(self):
        from analytics.incois.repository import IncoisAdvisoryRepository
        repo = IncoisAdvisoryRepository(self.session)

        row = repo.insert_advisory(
            advisory_date=date(2026, 8, 14),
            sector_id="SEC004",
            landing_center="Karwar",
            bearing_degrees=235.0,
            distance_km=45.0,
            depth_m=80.0,
            latitude=14.50,
            longitude=73.25,
        )
        self.session.flush()
        self.assertIsNotNone(row)
        self.assertEqual(row.landing_center, "Karwar")

    def test_duplicate_skipped(self):
        from analytics.incois.repository import IncoisAdvisoryRepository
        repo = IncoisAdvisoryRepository(self.session)

        kwargs = dict(
            advisory_date=date(2026, 8, 14),
            sector_id="SEC004",
            landing_center="Karwar",
            bearing_degrees=235.0,
            distance_km=45.0,
            depth_m=80.0,
            latitude=14.50,
            longitude=73.25,
        )
        row1 = repo.insert_advisory(**kwargs)
        self.session.flush()
        row2 = repo.insert_advisory(**kwargs)

        self.assertIsNotNone(row1)
        self.assertIsNone(row2)  # duplicate → skipped

    def test_count_for_date(self):
        from analytics.incois.repository import IncoisAdvisoryRepository
        repo = IncoisAdvisoryRepository(self.session)

        repo.insert_advisory(
            advisory_date=date(2026, 8, 14),
            sector_id="SEC004",
            landing_center="Karwar",
            bearing_degrees=235.0,
            distance_km=45.0,
            depth_m=80.0,
            latitude=14.50,
            longitude=73.25,
        )
        self.session.flush()

        count = repo.count_advisories_for_date(date(2026, 8, 14))
        self.assertEqual(count, 1)

        count_other = repo.count_advisories_for_date(date(2026, 8, 13))
        self.assertEqual(count_other, 0)


if __name__ == "__main__":
    unittest.main()
