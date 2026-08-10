"""Module 3 Operational Risk standalone repository tests.

Tests verify:
- RiskResult insertion
- Duplicate location/timestamp/version is rejected/ignored
- get_latest_risk_results returns exactly one per location
- get_latest_risk_results ignores locations without results
- Multiple hourly results coexist for the same location
"""

import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool

from analytics.persistence.database import create_tables
from analytics.persistence.models import RiskResult, SamplingLocation
from analytics.persistence.repository import RiskRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.scoring.models import RiskScoredResult

_UTC = timezone.utc

class RiskRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )

        @event.listens_for(self.engine, "connect")
        def _set_sqlite_fk(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()  # type: ignore[union-attr]
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        create_tables(self.engine)
        self.session_factory = create_session_factory(self.engine)

        # Seed canonical locations for testing
        with session_scope(self.session_factory) as session:
            for i in range(1, 26):  # 25 Canonical locations
                session.add(
                    SamplingLocation(
                        location_id=f"KARN_{i:03d}",
                        latitude=14.0 + (i * 0.1),
                        longitude=74.0,
                    )
                )

    def tearDown(self) -> None:
        self.engine.dispose()

    def _base_result(self, location_id: int, obs_timestamp: datetime) -> RiskScoredResult:
        return RiskScoredResult(
            sampling_location_id=location_id,
            observation_timestamp=obs_timestamp,
            wind_speed=4.0,
            wave_height=0.3,
            risk_score=0.0,
            risk_category="Safe",
            confidence_score=100.0,
            analytics_version="deterministic-v1",
            source="open-meteo"
        )

    def test_insert_risk_result(self) -> None:
        """Verify insertion of a valid Risk result."""
        result = self._base_result(1, datetime(2026, 8, 10, 10, 0, tzinfo=_UTC))
        with session_scope(self.session_factory) as session:
            repo = RiskRepository(session)
            inserted = repo.insert_risk_result(result)
            self.assertEqual(inserted, 1)

            db_result = session.get(RiskResult, 1)
            self.assertIsNotNone(db_result)
            self.assertEqual(db_result.risk_score, 0.0)
            self.assertEqual(db_result.source, "open-meteo")

    def test_duplicate_insertion_ignored(self) -> None:
        """Inserting the same location/timestamp/version should be ignored by the repository."""
        result = self._base_result(1, datetime(2026, 8, 10, 10, 0, tzinfo=_UTC))
        with session_scope(self.session_factory) as session:
            repo = RiskRepository(session)
            inserted1 = repo.insert_risk_result(result)
            inserted2 = repo.insert_risk_result(result)

            self.assertEqual(inserted1, 1)
            self.assertEqual(inserted2, 0)

            results = session.query(RiskResult).all()
            self.assertEqual(len(results), 1)

    def test_multiple_hourly_results_same_location(self) -> None:
        """Can insert multiple results for the same location on different hours."""
        with session_scope(self.session_factory) as session:
            repo = RiskRepository(session)
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 10, 0, tzinfo=_UTC)))
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 11, 0, tzinfo=_UTC)))
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 12, 0, tzinfo=_UTC)))

            results = session.query(RiskResult).all()
            self.assertEqual(len(results), 3)

    def test_get_latest_risk_result_for_location(self) -> None:
        """Retrieves the correct single latest result for a location."""
        with session_scope(self.session_factory) as session:
            repo = RiskRepository(session)
            # Insert out of order to ensure ORDER BY timestamp DESC works
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 10, 0, tzinfo=_UTC)))
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 12, 0, tzinfo=_UTC)))
            repo.insert_risk_result(self._base_result(1, datetime(2026, 8, 10, 11, 0, tzinfo=_UTC)))

            latest = repo.get_latest_risk_result_for_location(1)
            self.assertIsNotNone(latest)
            self.assertEqual(
                latest.observation_timestamp.replace(tzinfo=None),
                datetime(2026, 8, 10, 12, 0)
            )

    def test_canonical_location_test(self) -> None:
        """
        Explicit test: 25 canonical locations exist. 
        We supply 23 locations with results. 2 have none.
        The latest query must return exactly 23 results without fabricating missing ones.
        """
        with session_scope(self.session_factory) as session:
            repo = RiskRepository(session)
            
            # Insert results for locations 1 through 23
            for i in range(1, 24):
                repo.insert_risk_result(self._base_result(i, datetime(2026, 8, 10, 15, 0, tzinfo=_UTC)))
            
            # Locations 24 and 25 get NO results

            latest_results = repo.get_latest_risk_results()
            self.assertEqual(len(latest_results), 23)
            
            # Verify no missing data fabricated
            result_dict = {r.sampling_location_id: r.observation_timestamp for r in latest_results}
            self.assertNotIn(24, result_dict)
            self.assertNotIn(25, result_dict)
            self.assertIn(1, result_dict)
            self.assertIn(23, result_dict)


if __name__ == "__main__":
    unittest.main()
