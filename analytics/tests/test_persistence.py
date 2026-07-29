from datetime import date
import unittest

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import StaticPool

from analytics.persistence.database import create_tables
from analytics.persistence.exceptions import DuplicateObservationError, SchemaValidationError
from analytics.persistence.ingest import ingest_validated_dataframe
from analytics.persistence.queries import (
    get_latest_available_observation_date,
    get_observation_bounding_box,
    get_observation_count,
    get_observations_between_dates,
    get_observations_by_date,
)
from analytics.persistence.repository import EnvironmentalObservationRepository
from analytics.persistence.session import create_session_factory, session_scope


def sample_validated_dataframe() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Latitude": 14.1,
                "Longitude": 74.1,
                "Date": "2025-06-01",
                "SST": 29.5,
                "WindSpeed": 7.2,
                "WaveHeight": 1.1,
                "Chlorophyll": 0.2,
            },
            {
                "Latitude": 14.2,
                "Longitude": 74.2,
                "Date": "2025-06-01",
                "SST": 29.6,
                "WindSpeed": 7.5,
                "WaveHeight": None,
                "Chlorophyll": 0.3,
            },
        ]
    )


class PersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        create_tables(self.engine)
        self.session_factory = create_session_factory(self.engine)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_table_creation_and_insertion(self) -> None:
        with session_scope(self.session_factory) as session:
            summary = ingest_validated_dataframe(sample_validated_dataframe(), session)

        self.assertEqual(summary.rows_inserted, 2)

        with session_scope(self.session_factory) as session:
            self.assertEqual(get_observation_count(session), 2)

    def test_schema_validation_rejects_missing_columns(self) -> None:
        dataframe = sample_validated_dataframe().drop(columns=["SST"])

        with session_scope(self.session_factory) as session:
            with self.assertRaises(SchemaValidationError):
                ingest_validated_dataframe(dataframe, session)

    def test_duplicate_handling(self) -> None:
        with session_scope(self.session_factory) as session:
            ingest_validated_dataframe(sample_validated_dataframe(), session)

        with session_scope(self.session_factory) as session:
            with self.assertRaises(DuplicateObservationError):
                ingest_validated_dataframe(sample_validated_dataframe(), session)

    def test_query_operations(self) -> None:
        with session_scope(self.session_factory) as session:
            ingest_validated_dataframe(sample_validated_dataframe(), session)

        with session_scope(self.session_factory) as session:
            observations = get_observations_by_date(session, date(2025, 6, 1))
            between = get_observations_between_dates(session, date(2025, 6, 1), date(2025, 6, 2))
            latest = get_latest_available_observation_date(session)
            bbox = get_observation_bounding_box(session)

        self.assertEqual(len(observations), 2)
        self.assertEqual(len(between), 2)
        self.assertEqual(latest, date(2025, 6, 1))
        self.assertEqual(bbox["min_latitude"], 14.1)
        self.assertEqual(bbox["max_longitude"], 74.2)

    def test_delete_observations(self) -> None:
        with session_scope(self.session_factory) as session:
            ingest_validated_dataframe(sample_validated_dataframe(), session)

        with session_scope(self.session_factory) as session:
            repository = EnvironmentalObservationRepository(session)
            deleted = repository.delete_observations(observation_date=date(2025, 6, 1))

        self.assertEqual(deleted, 2)

        with session_scope(self.session_factory) as session:
            self.assertEqual(get_observation_count(session), 0)

    def test_rollback_behaviour(self) -> None:
        class IntentionalFailure(SQLAlchemyError):
            pass

        with self.assertRaises(IntentionalFailure):
            with session_scope(self.session_factory) as session:
                ingest_validated_dataframe(sample_validated_dataframe(), session)
                raise IntentionalFailure("force rollback")

        with session_scope(self.session_factory) as session:
            self.assertEqual(get_observation_count(session), 0)


if __name__ == "__main__":
    unittest.main()
