import pandas as pd

from .metadata import get_parameter_columns, list_parameter_metadata


def standardize_environmental_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    standardized = dataframe.copy()

    if "Date" in standardized:
        standardized["Date"] = pd.to_datetime(standardized["Date"], errors="coerce")

    for coordinate_column in ("Latitude", "Longitude"):
        if coordinate_column in standardized:
            standardized[coordinate_column] = pd.to_numeric(
                standardized[coordinate_column],
                errors="coerce",
            )

    for metadata in list_parameter_metadata():
        if metadata.column not in standardized:
            standardized[metadata.column] = pd.NA

        values = pd.to_numeric(standardized[metadata.column], errors="coerce")
        values = (values * metadata.standardization_scale) + metadata.standardization_offset
        standardized[metadata.column] = values.astype("Float64")

    return standardized[["Latitude", "Longitude", "Date", *get_parameter_columns()]]
