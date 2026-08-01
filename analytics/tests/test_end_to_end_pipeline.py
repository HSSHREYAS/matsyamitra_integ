import unittest
from unittest.mock import patch

import pandas as pd
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool

from analytics.config import DateRange, PipelineConfig
from analytics.end_to_end_pipeline import run_end_to_end_pipeline
from analytics.persistence.database import create_tables
from analytics.persistence.models import AnalyticsResult, EnvironmentalObservation
from analytics.persistence.repository import EnvironmentalObservationRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.pipeline import DatasetValidationResult, EnvironmentalPipelineResult


def fake_pipeline_result(dataframe: pd.DataFrame | None = None) -> EnvironmentalPipelineResult:
    frame = dataframe if dataframe is not None else pd.DataFrame(
        [
            {
                "Latitude": 14.1,
                "Longitude": 74.1,
                "Date": "2025-06-01",
                "SST": 27.0,
                "WindSpeed": 5.0,
                "WaveHeight": 0.8,
                "Chlorophyll": 1.0,
            },
            {
                "Latitude": 14.2,
                "Longitude": 74.2,
                "Date": "2025-06-01",
                "SST": 30.0,
                "WindSpeed": 12.0,
                "WaveHeight": 1.8,
                "Chlorophyll": 0.5,
            },
        ]
    )
    return EnvironmentalPipelineResult(
        dataframe=frame,
        dataset_results=[
            DatasetValidationResult(
                dataset_key="test",
                parameter="Synthetic",
                output_column="SST",
                dataframe=pd.DataFrame(),
                sampled_locations=len(frame),
                valid_observations=len(frame),
                missing_observations=0,
                execution_time_seconds=0.01,
            )
        ],
        execution_time_seconds=0.02,
    )


def fake_extraction_runner(**_: object) -> EnvironmentalPipelineResult:
    return fake_pipeline_result()


class EndToEndPipelineTests(unittest.TestCase):
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

    def test_pipeline_stores_observations_and_analytics_results(self) -> None:
        summary = run_end_to_end_pipeline(
            extraction_runner=fake_extraction_runner,
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
        )

        self.assertTrue(summary.extraction_complete)
        self.assertEqual(summary.observations_inserted, 2)
        self.assertEqual(summary.analytics_generated, 2)
        self.assertEqual(summary.analytics_stored, 2)

        with session_scope(self.session_factory) as session:
            repository = EnvironmentalObservationRepository(session)
            self.assertEqual(repository.count_rows(), 2)
            self.assertEqual(repository.count_analytics_rows(), 2)
            analytics_rows = session.scalars(select(AnalyticsResult)).all()

        self.assertTrue(all(row.observation_id is not None for row in analytics_rows))
        self.assertTrue(all(row.pfz_category for row in analytics_rows))

    def test_duplicate_skip_policy_does_not_rescore_existing_observations(self) -> None:
        run_end_to_end_pipeline(
            extraction_runner=fake_extraction_runner,
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
        )
        summary = run_end_to_end_pipeline(
            extraction_runner=fake_extraction_runner,
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
            pipeline_config=PipelineConfig(duplicate_policy="skip"),
        )

        self.assertEqual(summary.observations_inserted, 0)
        self.assertEqual(summary.observations_skipped, 2)
        self.assertEqual(summary.analytics_generated, 0)

        with session_scope(self.session_factory) as session:
            repository = EnvironmentalObservationRepository(session)
            self.assertEqual(repository.count_rows(), 2)
            self.assertEqual(repository.count_analytics_rows(), 2)

    def test_duplicate_update_policy_refreshes_observation_and_analytics(self) -> None:
        run_end_to_end_pipeline(
            extraction_runner=fake_extraction_runner,
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
        )

        updated = pd.DataFrame(
            [
                {
                    "Latitude": 14.1,
                    "Longitude": 74.1,
                    "Date": "2025-06-01",
                    "SST": 26.0,
                    "WindSpeed": 4.0,
                    "WaveHeight": 0.4,
                    "Chlorophyll": 1.5,
                }
            ]
        )

        summary = run_end_to_end_pipeline(
            extraction_runner=lambda **_: fake_pipeline_result(updated),
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
            pipeline_config=PipelineConfig(duplicate_policy="update"),
        )

        self.assertEqual(summary.observations_updated, 1)
        self.assertEqual(summary.analytics_generated, 1)

        with session_scope(self.session_factory) as session:
            observation = session.scalar(
                select(EnvironmentalObservation).where(EnvironmentalObservation.latitude == 14.1)
            )
            repository = EnvironmentalObservationRepository(session)
            self.assertEqual(repository.count_rows(), 2)
            self.assertEqual(repository.count_analytics_rows(), 2)

        self.assertEqual(observation.sst, 26.0)

    def test_duplicate_replace_policy_recreates_observation_and_analytics(self) -> None:
        run_end_to_end_pipeline(
            extraction_runner=fake_extraction_runner,
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
        )

        replacement = pd.DataFrame(
            [
                {
                    "Latitude": 14.1,
                    "Longitude": 74.1,
                    "Date": "2025-06-01",
                    "SST": 28.0,
                    "WindSpeed": 3.0,
                    "WaveHeight": 0.6,
                    "Chlorophyll": 1.7,
                }
            ]
        )

        summary = run_end_to_end_pipeline(
            extraction_runner=lambda **_: fake_pipeline_result(replacement),
            engine=self.engine,
            initialize_earth_engine=False,
            create_schema=False,
            pipeline_config=PipelineConfig(duplicate_policy="replace"),
        )

        self.assertEqual(summary.observations_replaced, 1)
        self.assertEqual(summary.observations_inserted, 1)
        self.assertEqual(summary.analytics_generated, 1)

        with session_scope(self.session_factory) as session:
            repository = EnvironmentalObservationRepository(session)
            self.assertEqual(repository.count_rows(), 2)
            self.assertEqual(repository.count_analytics_rows(), 2)
            observation = session.scalar(
                select(EnvironmentalObservation).where(EnvironmentalObservation.latitude == 14.1)
            )

        self.assertEqual(observation.sst, 28.0)

    def test_pipeline_rolls_back_when_analytics_generation_fails(self) -> None:
        with self.assertRaises(RuntimeError):
            with patch(
                "analytics.end_to_end_pipeline.score_record",
                side_effect=RuntimeError("analytics failed"),
            ):
                run_end_to_end_pipeline(
                    extraction_runner=fake_extraction_runner,
                    engine=self.engine,
                    initialize_earth_engine=False,
                    create_schema=False,
                )

        with session_scope(self.session_factory) as session:
            repository = EnvironmentalObservationRepository(session)
            self.assertEqual(repository.count_rows(), 0)
            self.assertEqual(repository.count_analytics_rows(), 0)


if __name__ == "__main__":
    unittest.main()
