from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from time import perf_counter
from typing import Any

import ee

from analytics.config import (
    DEFAULT_DATE_RANGE,
    DEFAULT_PIPELINE_CONFIG,
    DEFAULT_SAMPLING_CONFIG,
    EARTH_ENGINE_PROJECT_ID,
    DateRange,
    PipelineConfig,
    SamplingConfig,
)
from analytics.pipeline import EnvironmentalPipelineResult, run_environmental_pipeline
from analytics.persistence.database import create_database_engine, create_tables
from analytics.persistence.ingest import validate_persistence_schema
from analytics.persistence.repository import EnvironmentalObservationRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.report import run_quality_assurance_pipeline
from analytics.scoring import score_record


PipelineRunner = Callable[..., EnvironmentalPipelineResult]


@dataclass(frozen=True)
class EndToEndPipelineSummary:
    extraction_complete: bool
    raw_observations: int
    observations_retained: int
    observations_inserted: int
    observations_skipped: int
    observations_updated: int
    observations_replaced: int
    analytics_generated: int
    analytics_stored: int
    execution_time_seconds: float
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_text(self) -> str:
        lines = [
            "End-to-End Environmental Data Persistence Pipeline Summary",
            "",
            f"Extraction Complete: {self.extraction_complete}",
            f"Raw Observations: {self.raw_observations}",
            f"Observations Retained: {self.observations_retained}",
            f"Observations Inserted: {self.observations_inserted}",
            f"Observations Skipped: {self.observations_skipped}",
            f"Observations Updated: {self.observations_updated}",
            f"Observations Replaced: {self.observations_replaced}",
            f"Analytics Generated: {self.analytics_generated}",
            f"Analytics Stored: {self.analytics_stored}",
            f"Execution Time: {self.execution_time_seconds:.2f}s",
            "",
            "Warnings:",
        ]
        lines.extend(f"- {warning}" for warning in self.warnings) if self.warnings else lines.append("- None")
        lines.append("")
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in self.errors) if self.errors else lines.append("- None")
        return "\n".join(lines)


def run_end_to_end_pipeline(
    *,
    date_range: DateRange = DEFAULT_DATE_RANGE,
    sampling: SamplingConfig = DEFAULT_SAMPLING_CONFIG,
    pipeline_config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
    extraction_runner: PipelineRunner = run_environmental_pipeline,
    engine: Any | None = None,
    initialize_earth_engine: bool = True,
    create_schema: bool = True,
) -> EndToEndPipelineSummary:
    started_at = perf_counter()
    warnings: list[str] = []

    if initialize_earth_engine:
        ee.Initialize(project=EARTH_ENGINE_PROJECT_ID)

    extraction_result = extraction_runner(date_range=date_range, sampling=sampling)
    warnings.extend(
        result.warning
        for result in extraction_result.dataset_results
        if result.warning
    )

    quality_report = run_quality_assurance_pipeline(extraction_result.dataframe)
    clean_dataframe = quality_report.clean_dataframe
    validate_persistence_schema(clean_dataframe)

    database_engine = engine or create_database_engine()
    if create_schema:
        create_tables(database_engine)

    session_factory = create_session_factory(database_engine)
    with session_scope(session_factory) as session:
        repository = EnvironmentalObservationRepository(session)
        repository.upsert_dataset_metadata(last_verified=date.today())
        run = repository.create_extraction_run(
            requested_start_date=date.fromisoformat(date_range.start),
            requested_end_date=date.fromisoformat(date_range.end),
            sample_count=len(extraction_result.dataframe),
            retained_count=len(clean_dataframe),
            missing_summary=quality_report.summary["parameter_quality"],
            execution_time=extraction_result.execution_time_seconds,
            status="success",
            warnings=warnings,
        )
        observation_outcome = repository.insert_observations_with_policy(
            clean_dataframe,
            run.run_id,
            duplicate_policy=pipeline_config.duplicate_policy,
        )
        analytics_rows = [
            _score_observation(
                observation=observation,
                analytics_version=pipeline_config.analytics_version,
            )
            for observation in observation_outcome.observations_for_analytics
        ]
        analytics_outcome = repository.store_analytics_results(
            analytics_rows,
            analytics_version=pipeline_config.analytics_version,
        )

    return EndToEndPipelineSummary(
        extraction_complete=True,
        raw_observations=len(extraction_result.dataframe),
        observations_retained=len(clean_dataframe),
        observations_inserted=observation_outcome.inserted_count,
        observations_skipped=observation_outcome.skipped_count,
        observations_updated=observation_outcome.updated_count,
        observations_replaced=observation_outcome.replaced_count,
        analytics_generated=analytics_outcome.generated_count,
        analytics_stored=analytics_outcome.stored_count,
        execution_time_seconds=perf_counter() - started_at,
        warnings=warnings,
        errors=[],
    )


def _score_observation(observation: Any, analytics_version: str) -> dict[str, Any]:
    scored = score_record(
        {
            "Latitude": observation.latitude,
            "Longitude": observation.longitude,
            "Date": datetime.combine(observation.observation_date, datetime.min.time()),
            "SST": observation.sst,
            "WindSpeed": observation.wind_speed,
            "WaveHeight": observation.wave_height,
            "Chlorophyll": observation.chlorophyll,
        }
    )

    return {
        "observation_id": observation.id,
        "pfz_score": scored.pfz_score,
        "pfz_category": scored.pfz_category,
        "risk_score": scored.risk_score,
        "risk_category": scored.risk_category,
        "confidence_score": scored.confidence_score,
        "confidence_label": scored.confidence_label,
        "explanation": scored.explanation,
        "analytics_version": analytics_version,
    }
