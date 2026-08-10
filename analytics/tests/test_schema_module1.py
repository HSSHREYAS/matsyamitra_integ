"""Module 1 schema tests — sampling_locations, pfz_results, risk_results.

Tests verify:
  1.  Sampling locations can be created and retrieved.
  2.  EnvironmentalObservation references a SamplingLocation.
  3.  MarineObservation references a SamplingLocation.
  4.  PfzResult references correct SamplingLocation.
  5.  PfzResult references EnvironmentalObservation.
  6.  RiskResult references correct SamplingLocation.
  7.  RiskResult references MarineObservation.
  8.  Multiple PfzResults can exist for one location (different dates).
  9.  Multiple hourly RiskResults can exist for one location (different timestamps).
  10. PfzResult duplicate constraint (same location + date + version) raises IntegrityError.
  11. RiskResult duplicate constraint (same location + timestamp + version) raises IntegrityError.
  12. Exactly 25 canonical sampling locations can be seeded.
  13. KARN_001 through KARN_025 all exist after seeding.
  14. MarineObservation.sampling_location_id is linked deterministically via location_id.
  15. Unmatched EnvironmentalObservation remains valid with sampling_location_id = NULL.
  16. Existing observation row counts are not affected by adding new tables.
"""

from __future__ import annotations

import unittest
from datetime import date, datetime, timezone

from sqlalchemy import create_engine, event, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

from analytics.persistence.database import create_tables
from analytics.persistence.models import (
    AnalyticsResult,
    EnvironmentalObservation,
    ExtractionRun,
    MarineObservation,
    PfzResult,
    RiskResult,
    SamplingLocation,
)
from analytics.persistence.session import create_session_factory, session_scope


# ── Canonical location data (mirrors sampling_points.geojson) ─────────────────
_CANONICAL_LOCATIONS: list[tuple[str, float, float]] = [
    ("KARN_001", 14.602642, 73.152614),
    ("KARN_002", 13.714424, 74.206417),
    ("KARN_003", 14.252099, 73.284125),
    ("KARN_004", 14.576383, 73.371932),
    ("KARN_005", 12.656436, 74.245355),
    ("KARN_006", 13.876570, 73.098200),
    ("KARN_007", 13.628876, 74.066202),
    ("KARN_008", 13.697208, 74.292278),
    ("KARN_009", 13.841149, 73.600926),
    ("KARN_010", 13.701877, 74.189533),
    ("KARN_011", 13.642529, 74.507275),
    ("KARN_012", 13.819599, 74.118591),
    ("KARN_013", 14.444009, 73.421502),
    ("KARN_014", 12.360216, 73.587784),
    ("KARN_015", 12.904593, 73.898817),
    ("KARN_016", 14.288519, 73.698840),
    ("KARN_017", 14.437228, 73.948746),
    ("KARN_018", 13.343755, 74.666625),
    ("KARN_019", 13.722979, 73.496794),
    ("KARN_020", 14.117504, 73.262162),
    ("KARN_021", 13.762229, 73.216743),
    ("KARN_022", 13.522264, 73.478449),
    ("KARN_023", 12.397850, 73.472452),
    ("KARN_024", 13.763693, 73.448016),
    ("KARN_025", 12.896538, 74.719480),
]

_UTC = timezone.utc


def _utcnow() -> datetime:
    return datetime.now(_UTC)


class SchemaModule1Tests(unittest.TestCase):
    # ── Setup ──────────────────────────────────────────────────────────────────

    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )

        # Enable FK enforcement in SQLite (disabled by default).
        @event.listens_for(self.engine, "connect")
        def _set_sqlite_fk(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()  # type: ignore[union-attr]
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        create_tables(self.engine)
        self.session_factory = create_session_factory(self.engine)

    def tearDown(self) -> None:
        self.engine.dispose()

    # ── Private helpers ────────────────────────────────────────────────────────

    def _make_sampling_location(
        self,
        session: object,
        location_id: str = "KARN_001",
        lat: float = 14.602642,
        lon: float = 73.152614,
    ) -> SamplingLocation:
        loc = SamplingLocation(location_id=location_id, latitude=lat, longitude=lon)
        session.add(loc)  # type: ignore[union-attr]
        session.flush()  # type: ignore[union-attr]
        return loc

    def _make_extraction_run(self, session: object) -> ExtractionRun:
        run = ExtractionRun(
            sample_count=1,
            retained_count=1,
            missing_summary={},
            status="success",
            warnings=[],
        )
        session.add(run)  # type: ignore[union-attr]
        session.flush()  # type: ignore[union-attr]
        return run

    def _make_env_observation(
        self,
        session: object,
        run_id: str,
        lat: float = 14.1,
        lon: float = 74.1,
        obs_date: date = date(2025, 6, 1),
        sampling_location_id: int | None = None,
    ) -> EnvironmentalObservation:
        obs = EnvironmentalObservation(
            latitude=lat,
            longitude=lon,
            observation_date=obs_date,
            sst=28.0,
            wind_speed=5.0,
            wave_height=1.0,
            chlorophyll=0.5,
            run_id=run_id,
            sampling_location_id=sampling_location_id,
        )
        session.add(obs)  # type: ignore[union-attr]
        session.flush()  # type: ignore[union-attr]
        return obs

    def _make_marine_observation(
        self,
        session: object,
        location_id: str = "KARN_001",
        sampling_location_id: int | None = None,
        ts: datetime | None = None,
    ) -> MarineObservation:
        obs = MarineObservation(
            location_id=location_id,
            latitude=14.602642,
            longitude=73.152614,
            observation_timestamp=ts or _utcnow(),
            wind_speed=7.0,
            wave_height=2.0,
            source="open-meteo",
            source_metadata={},
            sampling_location_id=sampling_location_id,
        )
        session.add(obs)  # type: ignore[union-attr]
        session.flush()  # type: ignore[union-attr]
        return obs

    # ── Test 1: Sampling location create and retrieve ──────────────────────────

    def test_01_sampling_location_create_and_retrieve(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            loc_id = loc.id

        with session_scope(self.session_factory) as session:
            retrieved = session.scalar(
                select(SamplingLocation).where(SamplingLocation.location_id == "KARN_001")
            )

        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.id, loc_id)
        self.assertAlmostEqual(retrieved.latitude, 14.602642, places=5)
        self.assertAlmostEqual(retrieved.longitude, 73.152614, places=5)
        self.assertTrue(retrieved.is_active)

    # ── Test 2: EnvironmentalObservation references SamplingLocation ───────────

    def test_02_environmental_observation_references_sampling_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            run = self._make_extraction_run(session)
            obs = self._make_env_observation(
                session, run.run_id, sampling_location_id=loc.id
            )
            obs_id = obs.id

        with session_scope(self.session_factory) as session:
            obs = session.get(EnvironmentalObservation, obs_id)

        self.assertIsNotNone(obs)
        self.assertEqual(obs.sampling_location_id, 1)

    # ── Test 3: MarineObservation references SamplingLocation ─────────────────

    def test_03_marine_observation_references_sampling_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            mo = self._make_marine_observation(session, sampling_location_id=loc.id)
            mo_id = mo.marine_observation_id

        with session_scope(self.session_factory) as session:
            mo = session.get(MarineObservation, mo_id)

        self.assertIsNotNone(mo)
        self.assertEqual(mo.sampling_location_id, 1)

    # ── Test 4: PfzResult references correct SamplingLocation ─────────────────

    def test_04_pfz_result_references_sampling_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            pfz = PfzResult(
                sampling_location_id=loc.id,
                observation_date=date(2026, 8, 2),
                source="gee",
                sst=28.0,
                chlorophyll=0.5,
                pfz_score=8.5,
                pfz_category="Highly Favourable",
                confidence_score=95.0,
            )
            session.add(pfz)
            session.flush()
            pfz_id = pfz.id

        with session_scope(self.session_factory) as session:
            pfz = session.get(PfzResult, pfz_id)

        self.assertIsNotNone(pfz)
        self.assertEqual(pfz.sampling_location_id, 1)
        self.assertEqual(pfz.source, "gee")

    # ── Test 5: PfzResult references EnvironmentalObservation ─────────────────

    def test_05_pfz_result_references_environmental_observation(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            run = self._make_extraction_run(session)
            obs = self._make_env_observation(session, run.run_id, sampling_location_id=loc.id)
            pfz = PfzResult(
                sampling_location_id=loc.id,
                observation_date=date(2026, 8, 2),
                environmental_observation_id=obs.id,
                source="gee",
                sst=28.0,
                chlorophyll=0.5,
                pfz_score=8.5,
                pfz_category="Highly Favourable",
                confidence_score=95.0,
            )
            session.add(pfz)
            session.flush()
            pfz_id = pfz.id
            obs_id = obs.id

        with session_scope(self.session_factory) as session:
            pfz = session.get(PfzResult, pfz_id)

        self.assertIsNotNone(pfz)
        self.assertEqual(pfz.environmental_observation_id, obs_id)

    # ── Test 6: RiskResult references correct SamplingLocation ────────────────

    def test_06_risk_result_references_sampling_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            risk = RiskResult(
                sampling_location_id=loc.id,
                observation_timestamp=_utcnow(),
                source="open-meteo",
                wind_speed=7.5,
                wave_height=2.5,
                risk_score=6.0,
                risk_category="Moderate Risk",
                confidence_score=90.0,
            )
            session.add(risk)
            session.flush()
            risk_id = risk.id

        with session_scope(self.session_factory) as session:
            risk = session.get(RiskResult, risk_id)

        self.assertIsNotNone(risk)
        self.assertEqual(risk.sampling_location_id, 1)
        self.assertEqual(risk.source, "open-meteo")

    # ── Test 7: RiskResult references MarineObservation ───────────────────────

    def test_07_risk_result_references_marine_observation(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            ts = datetime(2026, 8, 10, 17, 30, tzinfo=_UTC)
            mo = self._make_marine_observation(session, sampling_location_id=loc.id, ts=ts)
            risk = RiskResult(
                sampling_location_id=loc.id,
                observation_timestamp=ts,
                marine_observation_id=mo.marine_observation_id,
                source="open-meteo",
                wind_speed=7.5,
                wave_height=2.5,
                risk_score=6.0,
                risk_category="Moderate Risk",
                confidence_score=90.0,
            )
            session.add(risk)
            session.flush()
            risk_id = risk.id
            mo_id = mo.marine_observation_id

        with session_scope(self.session_factory) as session:
            risk = session.get(RiskResult, risk_id)

        self.assertIsNotNone(risk)
        self.assertEqual(risk.marine_observation_id, mo_id)

    # ── Test 8: Multiple PfzResults for one location (different dates) ─────────

    def test_08_multiple_pfz_results_for_one_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            for day in (1, 2, 3):
                session.add(
                    PfzResult(
                        sampling_location_id=loc.id,
                        observation_date=date(2026, 8, day),
                        source="gee",
                        pfz_category="Favourable",
                        confidence_score=80.0,
                    )
                )
            session.flush()

        with session_scope(self.session_factory) as session:
            count = session.scalar(
                select(func.count()).select_from(PfzResult).where(
                    PfzResult.sampling_location_id == 1
                )
            )

        self.assertEqual(count, 3)

    # ── Test 9: Multiple hourly RiskResults for one location ───────────────────

    def test_09_multiple_risk_results_for_one_location(self) -> None:
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            for hour in (0, 1, 2, 3):
                session.add(
                    RiskResult(
                        sampling_location_id=loc.id,
                        observation_timestamp=datetime(2026, 8, 10, hour, 0, tzinfo=_UTC),
                        source="open-meteo",
                        risk_category="Safe",
                        confidence_score=70.0,
                    )
                )
            session.flush()

        with session_scope(self.session_factory) as session:
            count = session.scalar(
                select(func.count()).select_from(RiskResult).where(
                    RiskResult.sampling_location_id == 1
                )
            )

        self.assertEqual(count, 4)

    # ── Test 10: PfzResult duplicate constraint ────────────────────────────────

    def test_10_pfz_duplicate_constraint_raises_integrity_error(self) -> None:
        obs_date = date(2026, 8, 2)
        version = "deterministic-v1"

        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            session.add(
                PfzResult(
                    sampling_location_id=loc.id,
                    observation_date=obs_date,
                    source="gee",
                    pfz_category="Favourable",
                    confidence_score=80.0,
                    analytics_version=version,
                )
            )

        with self.assertRaises(IntegrityError):
            with session_scope(self.session_factory) as session:
                session.add(
                    PfzResult(
                        sampling_location_id=1,
                        observation_date=obs_date,
                        source="gee",
                        pfz_category="Moderate",
                        confidence_score=60.0,
                        analytics_version=version,
                    )
                )

    # ── Test 11: RiskResult duplicate constraint ───────────────────────────────

    def test_11_risk_duplicate_constraint_raises_integrity_error(self) -> None:
        ts = datetime(2026, 8, 10, 17, 30, tzinfo=_UTC)
        version = "deterministic-v1"

        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            session.add(
                RiskResult(
                    sampling_location_id=loc.id,
                    observation_timestamp=ts,
                    source="open-meteo",
                    risk_category="Safe",
                    confidence_score=90.0,
                    analytics_version=version,
                )
            )

        with self.assertRaises(IntegrityError):
            with session_scope(self.session_factory) as session:
                session.add(
                    RiskResult(
                        sampling_location_id=1,
                        observation_timestamp=ts,
                        source="open-meteo",
                        risk_category="Low Risk",
                        confidence_score=85.0,
                        analytics_version=version,
                    )
                )

    # ── Test 12: Exactly 25 canonical locations can be seeded ─────────────────

    def test_12_exactly_25_canonical_locations_seeded(self) -> None:
        with session_scope(self.session_factory) as session:
            for location_id, lat, lon in _CANONICAL_LOCATIONS:
                session.add(SamplingLocation(location_id=location_id, latitude=lat, longitude=lon))

        with session_scope(self.session_factory) as session:
            count = session.scalar(select(func.count()).select_from(SamplingLocation))

        self.assertEqual(count, 25)

    # ── Test 13: KARN_001 through KARN_025 all exist ───────────────────────────

    def test_13_karn_001_through_025_all_present(self) -> None:
        with session_scope(self.session_factory) as session:
            for location_id, lat, lon in _CANONICAL_LOCATIONS:
                session.add(SamplingLocation(location_id=location_id, latitude=lat, longitude=lon))

        expected_ids = {f"KARN_{i:03d}" for i in range(1, 26)}

        with session_scope(self.session_factory) as session:
            present_ids = set(
                session.scalars(select(SamplingLocation.location_id)).all()
            )

        self.assertEqual(present_ids, expected_ids)

    # ── Test 14: Marine observation linked deterministically via location_id ───

    def test_14_marine_observation_linked_via_location_id(self) -> None:
        """Simulates the migration backfill: match location_id to canonical location."""
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session, location_id="KARN_001")
            mo = self._make_marine_observation(session, location_id="KARN_001")
            # Simulate migration backfill: set sampling_location_id by exact location_id match
            mo.sampling_location_id = loc.id
            session.flush()
            mo_id = mo.marine_observation_id
            expected_sl_id = loc.id

        with session_scope(self.session_factory) as session:
            mo = session.get(MarineObservation, mo_id)

        self.assertIsNotNone(mo)
        self.assertEqual(mo.sampling_location_id, expected_sl_id)
        self.assertEqual(mo.location_id, "KARN_001")

    # ── Test 15: Unmatched EnvironmentalObservation valid with NULL FK ─────────

    def test_15_unmatched_environmental_observation_valid_with_null_sampling_location(
        self,
    ) -> None:
        """GEE random-sample observations have no canonical location — NULL is valid."""
        with session_scope(self.session_factory) as session:
            run = self._make_extraction_run(session)
            obs = self._make_env_observation(
                session, run.run_id, lat=13.5, lon=74.0, sampling_location_id=None
            )
            obs_id = obs.id

        with session_scope(self.session_factory) as session:
            obs = session.get(EnvironmentalObservation, obs_id)

        self.assertIsNotNone(obs)
        self.assertIsNone(obs.sampling_location_id)

    # ── Test 16: Existing row counts unchanged by new tables ───────────────────

    def test_16_existing_observation_counts_unchanged_after_new_tables(self) -> None:
        """Adding new tables and records must not affect existing observation counts."""
        # Insert two environmental observations and one marine observation
        with session_scope(self.session_factory) as session:
            run = self._make_extraction_run(session)
            self._make_env_observation(session, run.run_id, lat=14.1, lon=74.1)
            self._make_env_observation(session, run.run_id, lat=14.2, lon=74.2)
            self._make_marine_observation(session, location_id="KARN_001")

        # Add sampling locations, pfz_results, risk_results — counts must not change
        with session_scope(self.session_factory) as session:
            loc = self._make_sampling_location(session)
            session.add(
                PfzResult(
                    sampling_location_id=loc.id,
                    observation_date=date(2026, 8, 2),
                    source="gee",
                    pfz_category="Favourable",
                    confidence_score=80.0,
                )
            )
            session.add(
                RiskResult(
                    sampling_location_id=loc.id,
                    observation_timestamp=_utcnow(),
                    source="open-meteo",
                    risk_category="Safe",
                    confidence_score=90.0,
                )
            )

        with session_scope(self.session_factory) as session:
            env_count = session.scalar(
                select(func.count()).select_from(EnvironmentalObservation)
            )
            marine_count = session.scalar(
                select(func.count()).select_from(MarineObservation)
            )
            pfz_count = session.scalar(select(func.count()).select_from(PfzResult))
            risk_count = session.scalar(select(func.count()).select_from(RiskResult))

        self.assertEqual(env_count, 2)
        self.assertEqual(marine_count, 1)
        self.assertEqual(pfz_count, 1)
        self.assertEqual(risk_count, 1)


if __name__ == "__main__":
    unittest.main()
