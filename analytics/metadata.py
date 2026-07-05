from .config import PARAMETER_METADATA, ParameterMetadata, RECORD_ID_COLUMNS


def get_parameter_metadata(column: str) -> ParameterMetadata:
    try:
        return PARAMETER_METADATA[column]
    except KeyError as exc:
        available = ", ".join(sorted(PARAMETER_METADATA))
        raise KeyError(f"Unknown environmental parameter '{column}'. Available: {available}") from exc


def list_parameter_metadata() -> list[ParameterMetadata]:
    return list(PARAMETER_METADATA.values())


def get_parameter_columns() -> list[str]:
    return [metadata.column for metadata in list_parameter_metadata()]


def get_required_record_columns() -> list[str]:
    return [*RECORD_ID_COLUMNS, *get_parameter_columns()]


def describe_units() -> dict[str, str]:
    return {
        metadata.column: metadata.canonical_unit
        for metadata in list_parameter_metadata()
    }
