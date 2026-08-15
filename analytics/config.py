from dataclasses import dataclass, field
from datetime import date, timedelta
import os
from pathlib import Path
from typing import Any


ANALYTICS_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ANALYTICS_ROOT.parent

EARTH_ENGINE_PROJECT_ID = os.getenv(
    "MATSYAMITRA_GEE_PROJECT",
    "matsyamitra-492811",
)

AOI_PATH = ANALYTICS_ROOT / "data" / "geometry" / "karnataka_aoi.geojson"
SAMPLING_POINTS_PATH = ANALYTICS_ROOT / "data" / "geometry" / "sampling_points.geojson"


@dataclass(frozen=True)
class DateRange:
    start: str
    end: str

    def __post_init__(self) -> None:
        start_date = date.fromisoformat(self.start)
        end_date = date.fromisoformat(self.end)

        if start_date >= end_date:
            raise ValueError("DateRange.start must be earlier than DateRange.end.")


@dataclass(frozen=True)
class AnalysisDateConfig:
    analysis_date: str | None = None
    window_days: int = 14

    def __post_init__(self) -> None:
        if self.window_days <= 0:
            raise ValueError("AnalysisDateConfig.window_days must be greater than zero.")

    def to_date_range(self) -> DateRange:
        if self.analysis_date:
            start_date = date.fromisoformat(self.analysis_date)
            end_date = start_date + timedelta(days=self.window_days)
        else:
            end_date = date.today()
            start_date = end_date - timedelta(days=self.window_days)
            
        return DateRange(start=start_date.isoformat(), end=end_date.isoformat())


@dataclass(frozen=True)
class SamplingConfig:
    scale_meters: int = 25000
    sample_limit: int = 25
    seed: int = 42
    tile_scale: int = 4
    include_geometries: bool = True
    coordinate_precision: int = 6

    def __post_init__(self) -> None:
        if self.scale_meters <= 0:
            raise ValueError("SamplingConfig.scale_meters must be greater than zero.")

        if self.sample_limit <= 0:
            raise ValueError("SamplingConfig.sample_limit must be greater than zero.")

        if self.tile_scale <= 0:
            raise ValueError("SamplingConfig.tile_scale must be greater than zero.")

        if self.coordinate_precision < 0:
            raise ValueError("SamplingConfig.coordinate_precision cannot be negative.")


@dataclass(frozen=True)
class DatasetConfig:
    key: str
    dataset_id: str
    parameter: str
    output_column: str
    value_band: str
    display_name: str
    adapter: str = "single_band"
    source_bands: tuple[str, ...] = ()
    value_scale: float = 1.0
    value_offset: float = 0.0
    enabled: bool = True
    notes: str = ""


@dataclass(frozen=True)
class ParameterMetadata:
    column: str
    storage_name: str
    display_name: str
    dataset: str
    band: str
    unit: str
    canonical_unit: str
    valid_min: float
    valid_max: float
    missing_value_policy: str
    description: str
    standardization_scale: float = 1.0
    standardization_offset: float = 0.0


@dataclass(frozen=True)
class CleaningConfig:
    remove_invalid_rows: bool = True
    duplicate_policy: str = "drop"
    missing_value_strategy: str = "keep"
    missing_fill_values: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.duplicate_policy not in {"drop", "keep"}:
            raise ValueError("CleaningConfig.duplicate_policy must be either 'drop' or 'keep'.")

        if self.missing_value_strategy not in {"keep", "drop_rows", "fill"}:
            raise ValueError(
                "CleaningConfig.missing_value_strategy must be 'keep', 'drop_rows', or 'fill'."
            )


@dataclass(frozen=True)
class PersistenceTableNames:
    environmental_observations: str = "environmental_observations"
    extraction_runs: str = "extraction_runs"
    dataset_metadata: str = "dataset_metadata"
    analytics_results: str = "analytics_results"
    marine_observations: str = "marine_observations"
    sampling_locations: str = "sampling_locations"
    pfz_results: str = "pfz_results"
    risk_results: str = "risk_results"
    incois_advisories: str = "incois_advisories"


@dataclass(frozen=True)
class PipelineConfig:
    duplicate_policy: str = "skip"
    analytics_version: str = "deterministic-v1"

    def __post_init__(self) -> None:
        if self.duplicate_policy not in {"skip", "replace", "update"}:
            raise ValueError("PipelineConfig.duplicate_policy must be 'skip', 'replace', or 'update'.")

        if not self.analytics_version:
            raise ValueError("PipelineConfig.analytics_version is required.")


@dataclass(frozen=True)
class DatabaseConfig:
    database_url: str
    echo_sql: bool = False
    pool_pre_ping: bool = True
    schema_version: str = "1"
    table_names: PersistenceTableNames = field(default_factory=PersistenceTableNames)

    def __post_init__(self) -> None:
        if not self.database_url:
            raise ValueError(
                "DatabaseConfig.database_url is required. Set MATSYAMITRA_DATABASE_URL."
            )


@dataclass(frozen=True)
class RetentionConfig:
    data_retention_days: int = 7

    def __post_init__(self) -> None:
        if self.data_retention_days <= 0:
            raise ValueError("RetentionConfig.data_retention_days must be greater than zero.")


DEFAULT_ANALYSIS_DATE = AnalysisDateConfig(
    analysis_date=os.getenv("MATSYAMITRA_ANALYSIS_DATE", None),
    window_days=int(os.getenv("MATSYAMITRA_ANALYSIS_WINDOW_DAYS", "14")),
)

DEFAULT_DATE_RANGE = DateRange(
    start=os.getenv("MATSYAMITRA_START_DATE", DEFAULT_ANALYSIS_DATE.to_date_range().start),
    end=os.getenv("MATSYAMITRA_END_DATE", DEFAULT_ANALYSIS_DATE.to_date_range().end),
)

DEFAULT_SAMPLING_CONFIG = SamplingConfig(
    scale_meters=int(os.getenv("MATSYAMITRA_SAMPLE_SCALE_METERS", "25000")),
    sample_limit=int(os.getenv("MATSYAMITRA_SAMPLE_LIMIT", "25")),
    seed=int(os.getenv("MATSYAMITRA_SAMPLE_SEED", "42")),
    tile_scale=int(os.getenv("MATSYAMITRA_TILE_SCALE", "4")),
)

PARAMETER_METADATA = {
    "SST": ParameterMetadata(
        column="SST",
        storage_name="sst",
        display_name="Sea Surface Temperature",
        dataset="NOAA/CDR/OISST/V2_1",
        band="sst",
        unit="Celsius",
        canonical_unit="Celsius",
        valid_min=-2.0,
        valid_max=40.0,
        missing_value_policy="keep_and_report",
        description="Sea surface temperature extracted from NOAA OISST and standardized to Celsius.",
    ),
    "WindSpeed": ParameterMetadata(
        column="WindSpeed",
        storage_name="wind_speed",
        display_name="10m Wind Speed",
        dataset="ECMWF/ERA5/HOURLY",
        band="u_component_of_wind_10m,v_component_of_wind_10m",
        unit="meters_per_second",
        canonical_unit="meters_per_second",
        valid_min=0.0,
        valid_max=75.0,
        missing_value_policy="keep_and_report",
        description="10m wind speed computed as sqrt(u10^2 + v10^2) and standardized to meters per second.",
    ),
    "WaveHeight": ParameterMetadata(
        column="WaveHeight",
        storage_name="wave_height",
        display_name="Significant Wave Height",
        dataset="ECMWF/ERA5/HOURLY",
        band="significant_height_of_combined_wind_waves_and_swell",
        unit="meters",
        canonical_unit="meters",
        valid_min=0.0,
        valid_max=25.0,
        missing_value_policy="keep_and_report",
        description="Significant height of combined wind waves and swell standardized to meters.",
    ),
    "Chlorophyll": ParameterMetadata(
        column="Chlorophyll",
        storage_name="chlorophyll",
        display_name="Chlorophyll-a",
        dataset="COPERNICUS/MARINE/OC_GLO_BGC/PLANKTON_MULTI_4KM",
        band="CHL",
        unit="mg_per_cubic_meter",
        canonical_unit="mg_per_cubic_meter",
        valid_min=0.0,
        valid_max=100.0,
        missing_value_policy="keep_and_report",
        description="Chlorophyll-a concentration standardized to mg/m^3.",
    ),
}

RECORD_ID_COLUMNS = ("Latitude", "Longitude", "Date")
DEFAULT_CLEANING_CONFIG = CleaningConfig()
DEFAULT_RETENTION_CONFIG = RetentionConfig(
    data_retention_days=int(os.getenv("MATSYAMITRA_DATA_RETENTION_DAYS", "7")),
)
DEFAULT_PERSISTENCE_TABLE_NAMES = PersistenceTableNames(
    environmental_observations=os.getenv(
        "MATSYAMITRA_OBSERVATIONS_TABLE",
        "environmental_observations",
    ),
    extraction_runs=os.getenv("MATSYAMITRA_RUNS_TABLE", "extraction_runs"),
    dataset_metadata=os.getenv("MATSYAMITRA_METADATA_TABLE", "dataset_metadata"),
    analytics_results=os.getenv("MATSYAMITRA_ANALYTICS_RESULTS_TABLE", "analytics_results"),
    marine_observations=os.getenv("MATSYAMITRA_MARINE_OBSERVATIONS_TABLE", "marine_observations"),
    sampling_locations=os.getenv("MATSYAMITRA_SAMPLING_LOCATIONS_TABLE", "sampling_locations"),
    pfz_results=os.getenv("MATSYAMITRA_PFZ_RESULTS_TABLE", "pfz_results"),
    risk_results=os.getenv("MATSYAMITRA_RISK_RESULTS_TABLE", "risk_results"),
    incois_advisories=os.getenv("MATSYAMITRA_INCOIS_ADVISORIES_TABLE", "incois_advisories"),
)
DEFAULT_PIPELINE_CONFIG = PipelineConfig(
    duplicate_policy=os.getenv("MATSYAMITRA_DUPLICATE_POLICY", "skip").lower(),
    analytics_version=os.getenv("MATSYAMITRA_ANALYTICS_VERSION", "deterministic-v1"),
)


def load_database_config_from_env() -> DatabaseConfig:
    return DatabaseConfig(
        database_url=os.getenv("MATSYAMITRA_DATABASE_URL", ""),
        echo_sql=os.getenv("MATSYAMITRA_DATABASE_ECHO", "false").lower() == "true",
        pool_pre_ping=os.getenv("MATSYAMITRA_DATABASE_POOL_PRE_PING", "true").lower() == "true",
        schema_version=os.getenv("MATSYAMITRA_DATABASE_SCHEMA_VERSION", "1"),
        table_names=DEFAULT_PERSISTENCE_TABLE_NAMES,
    )
