"""Module 2 PFZ standalone repository tests.

Tests verify:
- PfzResult insertion
- Duplicate location/date/version is rejected/ignored
- get_latest_pfz_results returns exactly one per location
- get_latest_pfz_results ignores locations without results
"""

import unittest
from datetime import date

from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool

from analytics.persistence.database import create_tables
from analytics.persistence.models import PfzResult, SamplingLocation
from analytics.persistence.repository import PfzRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.scoring.models import PfzScoredResult


class PfzRepositoryTests(unittest.TestCase):
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
            for i in range(1, 4):
                session.add(
                    SamplingLocation(
                        location_id=f"KARN_{i:03d}",
                        latitude=14.0 + (i * 0.1),
                        longitude=74.0,
                    )
                )

    def tearDown(self) -> None:
        self.engine.dispose()

    def _base_result(self, location_id: int, obs_date: date) -> PfzScoredResult:
        return PfzScoredResult(
            sampling_location_id=location_id,
            observation_date=obs_date,
            sst=28.0,
            chlorophyll=1.0,
            pfz_score=10.0,
            pfz_category="Highly Favourable",
            confidence_score=100.0,
            analytics_version="deterministic-v1",
        )

    def test_insert_pfz_result(self) -> None:
        """Verify insertion of a valid PFZ result."""
        result = self._base_result(1, date(2026, 8, 10))
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            inserted = repo.insert_pfz_result(result)
            self.assertEqual(inserted, 1)

            db_result = session.get(PfzResult, 1)
            self.assertIsNotNone(db_result)
            self.assertEqual(db_result.pfz_score, 10.0)

    def test_duplicate_insertion_ignored(self) -> None:
        """Inserting the same location/date/version should be ignored by the repository."""
        result = self._base_result(1, date(2026, 8, 10))
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            inserted1 = repo.insert_pfz_result(result)
            inserted2 = repo.insert_pfz_result(result)

            self.assertEqual(inserted1, 1)
            self.assertEqual(inserted2, 0)

            results = session.query(PfzResult).all()
            self.assertEqual(len(results), 1)

    def test_multiple_dates_same_location(self) -> None:
        """Can insert multiple results for the same location on different dates."""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 10)))
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 11)))

            results = session.query(PfzResult).all()
            self.assertEqual(len(results), 2)

    def test_get_latest_pfz_result_for_location(self) -> None:
        """Retrieves the correct single latest result for a location."""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            # Insert out of order to ensure ORDER BY works
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 9)))
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 11)))
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 10)))

            latest = repo.get_latest_pfz_result_for_location(1)
            self.assertIsNotNone(latest)
            self.assertEqual(latest.observation_date, date(2026, 8, 11))

    def test_get_latest_pfz_results_across_locations(self) -> None:
        """Returns one result per location, regardless of how many dates each location has."""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            
            # Location 1: 3 dates (Aug 9, 10, 11) -> Latest is Aug 11
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 9)))
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 11)))
            repo.insert_pfz_result(self._base_result(1, date(2026, 8, 10)))

            # Location 2: 1 date (Aug 5) -> Latest is Aug 5
            repo.insert_pfz_result(self._base_result(2, date(2026, 8, 5)))

            # Location 3: 0 dates -> Should not appear in results

            latest_results = repo.get_latest_pfz_results()
            self.assertEqual(len(latest_results), 2)
            
            # Convert to dictionary for easy assertion
            result_dict = {r.sampling_location_id: r.observation_date for r in latest_results}
            self.assertEqual(result_dict[1], date(2026, 8, 11))
            self.assertEqual(result_dict[2], date(2026, 8, 5))
            self.assertNotIn(3, result_dict)

if __name__ == "__main__":
    unittest.main()
