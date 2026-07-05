from dataclasses import dataclass
from time import perf_counter

import pandas as pd

from .metadata import get_parameter_columns, get_required_record_columns, list_parameter_metadata


@dataclass(frozen=True)
class ParameterQualitySummary:
    column: str
    missing_count: int
    invalid_count: int
    outlier_count: int
    valid_count: int


@dataclass(frozen=True)
class QualityValidationResult:
    rows_sampled: int
    duplicate_count: int
    invalid_identity_count: int
    missing_required_columns: list[str]
    parameter_summaries: list[ParameterQualitySummary]
    invalid_row_indices: set[int]
    duplicate_row_indices: set[int]
    execution_time_seconds: float

    @property
    def rows_with_quality_issues(self) -> int:
        return len(self.invalid_row_indices | self.duplicate_row_indices)


def validate_environmental_dataframe(dataframe: pd.DataFrame) -> QualityValidationResult:
    started_at = perf_counter()
    missing_required_columns = [
        column for column in get_required_record_columns() if column not in dataframe.columns
    ]
    identity_invalid_indices = _find_invalid_identity_indices(dataframe)
    invalid_row_indices = set(identity_invalid_indices)
    parameter_summaries: list[ParameterQualitySummary] = []

    for metadata in list_parameter_metadata():
        if metadata.column not in dataframe.columns:
            parameter_summaries.append(
                ParameterQualitySummary(
                    column=metadata.column,
                    missing_count=len(dataframe),
                    invalid_count=0,
                    outlier_count=0,
                    valid_count=0,
                )
            )
            invalid_row_indices.update(dataframe.index.tolist())
            continue

        values = pd.to_numeric(dataframe[metadata.column], errors="coerce")
        missing_mask = values.isna()
        outlier_mask = values.notna() & (
            (values < metadata.valid_min) | (values > metadata.valid_max)
        )

        invalid_row_indices.update(dataframe.index[outlier_mask].tolist())
        valid_mask = values.notna() & ~outlier_mask

        parameter_summaries.append(
            ParameterQualitySummary(
                column=metadata.column,
                missing_count=int(missing_mask.sum()),
                invalid_count=int(outlier_mask.sum()),
                outlier_count=int(outlier_mask.sum()),
                valid_count=int(valid_mask.sum()),
            )
        )

    duplicate_row_indices = _find_duplicate_indices(dataframe)

    return QualityValidationResult(
        rows_sampled=len(dataframe),
        duplicate_count=len(duplicate_row_indices),
        invalid_identity_count=len(identity_invalid_indices),
        missing_required_columns=missing_required_columns,
        parameter_summaries=parameter_summaries,
        invalid_row_indices=invalid_row_indices,
        duplicate_row_indices=duplicate_row_indices,
        execution_time_seconds=perf_counter() - started_at,
    )


def _find_duplicate_indices(dataframe: pd.DataFrame) -> set[int]:
    key_columns = [column for column in ("Latitude", "Longitude", "Date") if column in dataframe]
    if not key_columns:
        return set()

    duplicate_mask = dataframe.duplicated(subset=key_columns, keep="first")
    return set(dataframe.index[duplicate_mask].tolist())


def _find_invalid_identity_indices(dataframe: pd.DataFrame) -> set[int]:
    invalid_indices: set[int] = set()

    if "Latitude" in dataframe:
        latitude = pd.to_numeric(dataframe["Latitude"], errors="coerce")
        latitude_invalid = latitude.isna() | (latitude < -90.0) | (latitude > 90.0)
        invalid_indices.update(dataframe.index[latitude_invalid].tolist())

    if "Longitude" in dataframe:
        longitude = pd.to_numeric(dataframe["Longitude"], errors="coerce")
        longitude_invalid = longitude.isna() | (longitude < -180.0) | (longitude > 180.0)
        invalid_indices.update(dataframe.index[longitude_invalid].tolist())

    if "Date" in dataframe:
        date_values = pd.to_datetime(dataframe["Date"], errors="coerce")
        invalid_indices.update(dataframe.index[date_values.isna()].tolist())

    return invalid_indices


def validation_summary_to_dataframe(result: QualityValidationResult) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Parameter": summary.column,
                "Missing": summary.missing_count,
                "Invalid": summary.invalid_count,
                "Outliers": summary.outlier_count,
                "Valid": summary.valid_count,
            }
            for summary in result.parameter_summaries
        ]
    )
