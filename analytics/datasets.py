from types import MappingProxyType

import ee

from .config import DatasetConfig


DATASET_REGISTRY = MappingProxyType(
    {
        "sst_noaa_oisst": DatasetConfig(
            key="sst_noaa_oisst",
            dataset_id="NOAA/CDR/OISST/V2_1",
            parameter="Sea Surface Temperature",
            output_column="SST",
            value_band="sst",
            display_name="NOAA OISST v2.1",
            value_scale=0.01,
            notes="Validation dataset for Phase 1 framework verification.",
        ),
        "chlorophyll_copernicus_global_ocean_colour": DatasetConfig(
            key="chlorophyll_copernicus_global_ocean_colour",
            dataset_id="COPERNICUS/MARINE/OC_GLO_BGC/PLANKTON_MULTI_4KM",
            parameter="Chlorophyll-a",
            output_column="Chlorophyll",
            value_band="CHL",
            display_name="Copernicus Global Ocean Colour Bio-Geo-Chemical L4",
            notes="Primary chlorophyll source. Availability starts in 2025 in the Earth Engine catalog.",
        ),
        "chlorophyll_jaxa_gcom_c": DatasetConfig(
            key="chlorophyll_jaxa_gcom_c",
            dataset_id="",
            parameter="Chlorophyll",
            output_column="Chlorophyll",
            value_band="",
            display_name="JAXA GCOM-C/SGLI",
            enabled=False,
            notes="Selected secondary chlorophyll source. Earth Engine catalog ID and band mapping must be finalized before activation.",
        ),
        "chlorophyll_modis_aqua_validation": DatasetConfig(
            key="chlorophyll_modis_aqua_validation",
            dataset_id="",
            parameter="Chlorophyll",
            output_column="Chlorophyll",
            value_band="",
            display_name="MODIS Aqua",
            enabled=False,
            notes="Selected chlorophyll validation source. Earth Engine catalog ID and band mapping must be finalized before activation.",
        ),
        "wind_speed_era5_hourly": DatasetConfig(
            key="wind_speed_era5_hourly",
            dataset_id="ECMWF/ERA5/HOURLY",
            parameter="Wind Speed",
            output_column="WindSpeed",
            value_band="",
            display_name="ERA5 Hourly 10m Wind Speed",
            adapter="wind_speed",
            source_bands=("u_component_of_wind_10m", "v_component_of_wind_10m"),
            notes="Computed as sqrt(u10^2 + v10^2) by a dataset adapter.",
        ),
        "wave_height_era5_hourly": DatasetConfig(
            key="wave_height_era5_hourly",
            dataset_id="ECMWF/ERA5/HOURLY",
            parameter="Wave Height",
            output_column="WaveHeight",
            value_band="significant_height_of_combined_wind_waves_and_swell",
            display_name="ERA5 Hourly Significant Wave Height",
            notes="Significant height of combined wind waves and swell.",
        ),
    }
)

SUPPORTED_ENVIRONMENTAL_DATASET_KEYS = (
    "sst_noaa_oisst",
    "wind_speed_era5_hourly",
    "wave_height_era5_hourly",
    "chlorophyll_copernicus_global_ocean_colour",
)


def get_dataset_config(key: str) -> DatasetConfig:
    try:
        return DATASET_REGISTRY[key]
    except KeyError as exc:
        available = ", ".join(sorted(DATASET_REGISTRY))
        raise KeyError(f"Unknown dataset key '{key}'. Available datasets: {available}") from exc


def list_dataset_configs(include_disabled: bool = True) -> list[DatasetConfig]:
    datasets = list(DATASET_REGISTRY.values())
    if include_disabled:
        return datasets
    return [dataset for dataset in datasets if dataset.enabled]


def load_image_collection(dataset: DatasetConfig) -> ee.ImageCollection:
    if not dataset.dataset_id:
        raise ValueError(f"Dataset '{dataset.key}' does not have an Earth Engine dataset ID yet.")

    return ee.ImageCollection(dataset.dataset_id)
