from dataclasses import dataclass
from time import perf_counter
from typing import Any

import pandas as pd

from .cleaner import clean_environmental_dataframe
from .config import DEFAULT_CLEANING_CONFIG, CleaningConfig
from .metadata import describe_units
from .quality import QualityValidationResult, validate_environmental_dataframe
from .standardizer import standardize_environmental_dataframe


@dataclass(frozen=True)
class QualityReport:
    clean_dataframe: pd.DataFrame
    human_readable: str
    summary: dict[str, Any]


def run_quality_assurance_pipeline(
    dataframe: pd.DataFrame,
    cleaning: CleaningConfig = DEFAULT_CLEANING_CONFIG,
) -> QualityReport:
    started_at = perf_counter()
    standardized = standardize_environmental_dataframe(dataframe)
    validation_result = validate_environmental_dataframe(standardized)
    clean_dataframe = clean_environmental_dataframe(standardized, validation_result, cleaning)
    execution_time_seconds = perf_counter() - started_at

    summary = build_machine_readable_summary(
        validation_result=validation_result,
        rows_retained=len(clean_dataframe),
        execution_time_seconds=execution_time_seconds,
    )

    return QualityReport(
        clean_dataframe=clean_dataframe,
        human_readable=build_human_readable_report(summary),
        summary=summary,
    )


def build_machine_readable_summary(
    validation_result: QualityValidationResult,
    rows_retained: int,
    execution_time_seconds: float,
) -> dict[str, Any]:
    rows_removed = validation_result.rows_sampled - rows_retained

    return {
        "extraction_summary": {
            "rows_sampled": validation_result.rows_sampled,
            "rows_retained": rows_retained,
            "rows_removed": rows_removed,
            "duplicate_observations": validation_result.duplicate_count,
            "invalid_identity_rows": validation_result.invalid_identity_count,
            "rows_with_quality_issues": validation_result.rows_with_quality_issues,
            "execution_time_seconds": round(execution_time_seconds, 4),
        },
        "parameter_quality": {
            summary.column: {
                "missing": summary.missing_count,
                "invalid": summary.invalid_count,
                "outliers": summary.outlier_count,
                "valid": summary.valid_count,
            }
            for summary in validation_result.parameter_summaries
        },
        "units": describe_units(),
        "missing_required_columns": validation_result.missing_required_columns,
    }


def build_human_readable_report(summary: dict[str, Any]) -> str:
    extraction = summary["extraction_summary"]
    lines = [
        "Environmental Data Quality Report",
        "",
        "Extraction Summary",
        f"Rows Sampled: {extraction['rows_sampled']}",
        f"Rows Retained: {extraction['rows_retained']}",
        f"Rows Removed: {extraction['rows_removed']}",
        f"Duplicate Observations: {extraction['duplicate_observations']}",
        f"Invalid Identity Rows: {extraction['invalid_identity_rows']}",
        f"Rows With Quality Issues: {extraction['rows_with_quality_issues']}",
        f"Execution Time: {extraction['execution_time_seconds']}s",
        "",
        "Parameter Quality",
    ]

    for parameter, stats in summary["parameter_quality"].items():
        lines.append(
            f"{parameter}: missing={stats['missing']}, invalid={stats['invalid']}, "
            f"outliers={stats['outliers']}, valid={stats['valid']}"
        )

    return "\n".join(lines)
