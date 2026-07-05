from dataclasses import dataclass
from datetime import date
from time import perf_counter
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from analytics.metadata import get_required_record_columns
from analytics.persistence.exceptions import InsertionError, SchemaValidationError
from analytics.persistence.repository import EnvironmentalObservationRepository


@dataclass(frozen=True)
class IngestionSummary:
    run_id: str
    rows_received: int
    rows_inserted: int
    metadata_rows_upserted: int
    execution_time_seconds: float


def ingest_validated_dataframe(
    dataframe: pd.DataFrame,
    session: Session,
    requested_start_date: date | None = None,
    requested_end_date: date | None = None,
    missing_summary: dict[str, Any] | None = None,
    warnings: list[str] | None = None,
) -> IngestionSummary:
    started_at = perf_counter()
    validate_persistence_schema(dataframe)
    repository = EnvironmentalObservationRepository(session)

    try:
        metadata_count = repository.upsert_dataset_metadata(last_verified=date.today())
        run = repository.create_extraction_run(
            requested_start_date=requested_start_date,
            requested_end_date=requested_end_date,
            sample_count=len(dataframe),
            retained_count=len(dataframe),
            missing_summary=missing_summary or _missing_summary(dataframe),
            execution_time=None,
            status="success",
            warnings=warnings or [],
        )
        inserted_count = repository.insert_observations(dataframe, run.run_id)
    except Exception as exc:
        if isinstance(exc, (SchemaValidationError, InsertionError)):
            raise
        raise InsertionError(f"Unable to ingest validated DataFrame: {exc}") from exc

    return IngestionSummary(
        run_id=run.run_id,
        rows_received=len(dataframe),
        rows_inserted=inserted_count,
        metadata_rows_upserted=metadata_count,
        execution_time_seconds=perf_counter() - started_at,
    )


def validate_persistence_schema(dataframe: pd.DataFrame) -> None:
    missing_columns = [column for column in get_required_record_columns() if column not in dataframe]
    if missing_columns:
        raise SchemaValidationError(f"Missing required columns: {', '.join(missing_columns)}")

    if dataframe.empty:
        raise SchemaValidationError("Validated environmental DataFrame is empty.")


def _missing_summary(dataframe: pd.DataFrame) -> dict[str, int]:
    return {
        column: int(dataframe[column].isna().sum())
        for column in get_required_record_columns()
        if column in dataframe
    }
