import pandas as pd

from .config import DEFAULT_CLEANING_CONFIG, CleaningConfig
from .metadata import get_parameter_columns
from .quality import QualityValidationResult, validate_environmental_dataframe
from .standardizer import standardize_environmental_dataframe


def clean_environmental_dataframe(
    dataframe: pd.DataFrame,
    validation_result: QualityValidationResult,
    cleaning: CleaningConfig = DEFAULT_CLEANING_CONFIG,
) -> pd.DataFrame:
    cleaned = dataframe.copy()
    rows_to_remove: set[int] = set()

    if cleaning.remove_invalid_rows:
        rows_to_remove.update(validation_result.invalid_row_indices)

    if cleaning.duplicate_policy == "drop":
        rows_to_remove.update(validation_result.duplicate_row_indices)

    if rows_to_remove:
        cleaned = cleaned.drop(index=sorted(rows_to_remove), errors="ignore")

    if cleaning.missing_value_strategy == "drop_rows":
        cleaned = cleaned.dropna(subset=get_parameter_columns(), how="any")

    if cleaning.missing_value_strategy == "fill":
        cleaned = cleaned.fillna(cleaning.missing_fill_values)

    return cleaned.reset_index(drop=True)


def standardize_validate_and_clean(
    dataframe: pd.DataFrame,
    cleaning: CleaningConfig = DEFAULT_CLEANING_CONFIG,
) -> tuple[pd.DataFrame, QualityValidationResult]:
    standardized = standardize_environmental_dataframe(dataframe)
    validation_result = validate_environmental_dataframe(standardized)
    cleaned = clean_environmental_dataframe(standardized, validation_result, cleaning)
    return cleaned, validation_result


def interpolate_missing_values(dataframe: pd.DataFrame) -> pd.DataFrame:
    raise NotImplementedError("Interpolation is reserved for a future analytics phase.")
