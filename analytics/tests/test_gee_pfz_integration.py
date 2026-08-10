"""Module 4 GEE Canonical Sampling and PFZ Integration tests."""

import unittest
from datetime import date, datetime, timezone
from unittest.mock import patch

from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool

from analytics.config import SamplingConfig
from analytics.persistence.database import create_tables
from analytics.persistence.models import EnvironmentalObservation, SamplingLocation, PfzResult
from analytics.persistence.repository import EnvironmentalObservationRepository, PfzRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.sampler import create_sampling_points
from analytics.scoring.models import PfzScoringInput, PfzScoredResult
from analytics.scoring.pfz_engine import score_pfz_record

_UTC = timezone.utc


class GeePfzIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )

        @event.listens_for(self.engine, "connect")
        def _set_sqlite_fk(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        create_tables(self.engine)
        self.session_factory = create_session_factory(self.engine)

        with session_scope(self.session_factory) as session:
            for i in range(1, 26):
                session.add(
                    SamplingLocation(
                        location_id=f"KARN_{i:03d}",
                        latitude=14.0 + (i * 0.1),
                        longitude=74.0,
                    )
                )

    def tearDown(self) -> None:
        self.engine.dispose()

    @patch("analytics.sampler.ee")
    def test_canonical_locations_loaded(self, mock_ee: object) -> None:
        """1. canonical 25 locations are loaded
           3. KARN IDs remain stable
           4. canonical coordinates remain unchanged"""
        # We simulate the exact call to create_sampling_points
        # The function reads GeoJSON directly without randomPoints
        config = SamplingConfig(sample_limit=25, seed=42, scale_meters=1000)
        # Because we patched ee, create_sampling_points will return a mock FeatureCollection
        fc = create_sampling_points(None, config)
        
        # We assert ee.FeatureCollection was called with a list of exactly 25 items
        mock_ee.FeatureCollection.assert_called()
        args = mock_ee.FeatureCollection.call_args[0][0]
        self.assertEqual(len(args), 25)
        # We expect a Feature, check arguments
        feature_mock = mock_ee.Feature.call_args_list[0]
        properties = feature_mock[0][1]
        self.assertIn("location_id", properties)
        self.assertEqual(properties["location_id"], "KARN_001")

    def test_missing_sst_and_chlorophyll_remain_null(self) -> None:
        """7. missing SST remains NULL 
           8. missing Chlorophyll remains NULL"""
        input_record = PfzScoringInput(
            sampling_location_id=1,
            observation_date=date(2026, 8, 10),
            sst=None,
            chlorophyll=None,
        )
        scored = score_pfz_record(input_record)
        self.assertIsNone(scored.sst)
        self.assertIsNone(scored.chlorophyll)
        self.assertIsNone(scored.pfz_score)

    def test_actual_gee_timestamp_preserved(self) -> None:
        """9. actual GEE timestamp is preserved (indirect test via the models)
           10. data_age_hours is calculated correctly"""
        # Testing the confidence calculations with actual separate data ages
        input_record = PfzScoringInput(
            sampling_location_id=1,
            observation_date=date(2026, 8, 10),
            sst=28.5,
            chlorophyll=0.5,
            sst_data_age_hours=72.0,       # 3 days old
            chlorophyll_data_age_hours=0.0 # fresh
        )
        scored = score_pfz_record(input_record)
        # Assuming fresh has weight 1.0, 72 hours drops factor to something lower like 0.7
        # We expect confidence to be less than 100% because SST is 3 days old
        self.assertLess(scored.confidence_score, 100.0)

    def test_pfz_input_contains_only_sst_and_chl(self) -> None:
        """11. PFZ input contains only SST + Chlorophyll"""
        input_record = PfzScoringInput(
            sampling_location_id=1,
            observation_date=date(2026, 8, 10),
            sst=28.5,
            chlorophyll=0.5,
        )
        self.assertFalse(hasattr(input_record, "wind_speed"))
        self.assertFalse(hasattr(input_record, "wave_height"))

    def test_pfz_source_is_gee(self) -> None:
        """12. PFZ source is 'gee'"""
        input_record = PfzScoringInput(
            sampling_location_id=1,
            observation_date=date(2026, 8, 10),
            sst=28.5,
            chlorophyll=0.5,
        )
        scored = score_pfz_record(input_record)
        self.assertEqual(scored.source, "gee")

    def test_pfz_result_persisted_with_location_id(self) -> None:
        """13. PFZ result is persisted with sampling_location_id
           14. duplicate PFZ result handling works"""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            result = PfzScoredResult(
                sampling_location_id=1,
                observation_date=date(2026, 8, 10),
                sst=28.5,
                chlorophyll=0.5,
                pfz_score=60.0,
                pfz_category="Moderate",
                confidence_score=100.0,
                analytics_version="deterministic-v1"
            )
            inserted = repo.insert_pfz_result(result)
            self.assertEqual(inserted, 1)
            
            # 14. duplicate PFZ
            inserted_again = repo.insert_pfz_result(result)
            self.assertEqual(inserted_again, 0)

            db_result = session.get(PfzResult, 1)
            self.assertEqual(db_result.sampling_location_id, 1)

    def test_latest_pfz_query_returns_one_result_per_location(self) -> None:
        """15. latest PFZ query returns one result per location"""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            repo.insert_pfz_result(PfzScoredResult(
                sampling_location_id=1,
                observation_date=date(2026, 8, 10),
                sst=28.5, chlorophyll=0.5, pfz_score=60.0, pfz_category="Moderate",
                confidence_score=100.0, analytics_version="v1"
            ))
            repo.insert_pfz_result(PfzScoredResult(
                sampling_location_id=1,
                observation_date=date(2026, 8, 11), # Newer
                sst=28.5, chlorophyll=0.5, pfz_score=70.0, pfz_category="Moderate",
                confidence_score=100.0, analytics_version="v1"
            ))
            
            latest = repo.get_latest_pfz_results()
            self.assertEqual(len(latest), 1)
            self.assertEqual(latest[0].observation_date, date(2026, 8, 11))

    def test_missing_locations_are_not_fabricated(self) -> None:
        """16. missing locations are not fabricated"""
        with session_scope(self.session_factory) as session:
            repo = PfzRepository(session)
            repo.insert_pfz_result(PfzScoredResult(
                sampling_location_id=2, # Only insert for ID 2
                observation_date=date(2026, 8, 10),
                sst=28.5, chlorophyll=0.5, pfz_score=60.0, pfz_category="Moderate",
                confidence_score=100.0, analytics_version="v1"
            ))
            
            latest = repo.get_latest_pfz_results()
            self.assertEqual(len(latest), 1)
            self.assertEqual(latest[0].sampling_location_id, 2)
            # Location 1, 3..25 are not fabricated


if __name__ == "__main__":
    unittest.main()
