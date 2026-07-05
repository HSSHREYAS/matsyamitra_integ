from dataclasses import dataclass
from time import perf_counter

import ee
import pandas as pd

from .adapters import required_bands_for
from .config import DEFAULT_DATE_RANGE, DEFAULT_SAMPLING_CONFIG, DateRange, SamplingConfig
from .datasets import (
    SUPPORTED_ENVIRONMENTAL_DATASET_KEYS,
    get_dataset_config,
    load_image_collection,
)
from .extractor import prepare_image
from .geometry import load_aoi_geometry
from .sampler import (
    create_sampling_points,
    sample_image_at_points,
    sampling_points_to_dataframe,
)


@dataclass(frozen=True)
class DatasetValidationResult:
    dataset_key: str
    parameter: str
    output_column: str
    dataframe: pd.DataFrame
    sampled_locations: int
    valid_observations: int
    missing_observations: int
    execution_time_seconds: float
    warning: str | None = None


@dataclass(frozen=True)
class EnvironmentalPipelineResult:
    dataframe: pd.DataFrame
    dataset_results: list[DatasetValidationResult]
    execution_time_seconds: float


def _empty_result(
    dataset_key: str,
    parameter: str,
    output_column: str,
    sampled_locations: int,
    started_at: float,
    warning: str,
) -> DatasetValidationResult:
    return DatasetValidationResult(
        dataset_key=dataset_key,
        parameter=parameter,
        output_column=output_column,
        dataframe=pd.DataFrame(),
        sampled_locations=sampled_locations,
        valid_observations=0,
        missing_observations=sampled_locations,
        execution_time_seconds=perf_counter() - started_at,
        warning=warning,
    )


def validate_collection_ready(
    dataset_key: str,
    aoi: ee.Geometry,
    date_range: DateRange,
) -> tuple[bool, str | None]:
    dataset = get_dataset_config(dataset_key)
    collection = (
        load_image_collection(dataset)
        .filterDate(date_range.start, date_range.end)
        .filterBounds(aoi)
    )
    collection_size = collection.size().getInfo()

    if collection_size == 0:
        return False, (
            f"No imagery found for {dataset.display_name} between "
            f"{date_range.start} and {date_range.end}."
        )

    first_image = ee.Image(collection.sort("system:time_start").first())
    available_bands = set(first_image.bandNames().getInfo())
    missing_bands = [band for band in required_bands_for(dataset) if band not in available_bands]

    if missing_bands:
        return False, (
            f"Missing required bands for {dataset.display_name}: "
            f"{', '.join(missing_bands)}."
        )

    return True, None


def extract_dataset_at_points(
    dataset_key: str,
    aoi: ee.Geometry,
    sampling_points: ee.FeatureCollection,
    sampled_locations: int,
    date_range: DateRange = DEFAULT_DATE_RANGE,
    sampling: SamplingConfig = DEFAULT_SAMPLING_CONFIG,
) -> DatasetValidationResult:
    started_at = perf_counter()

    try:
        dataset = get_dataset_config(dataset_key)
    except KeyError as exc:
        return _empty_result(
            dataset_key=dataset_key,
            parameter="Unknown",
            output_column=dataset_key,
            sampled_locations=sampled_locations,
            started_at=started_at,
            warning=str(exc),
        )

    try:
        ready, warning = validate_collection_ready(dataset_key, aoi, date_range)
        if not ready:
            return _empty_result(
                dataset_key=dataset.key,
                parameter=dataset.parameter,
                output_column=dataset.output_column,
                sampled_locations=sampled_locations,
                started_at=started_at,
                warning=warning or "Dataset is not ready for extraction.",
            )

        extracted = prepare_image(dataset, aoi, date_range)
        dataframe = sample_image_at_points(extracted, sampling_points, sampling)
    except Exception as exc:
        return _empty_result(
            dataset_key=dataset.key,
            parameter=dataset.parameter,
            output_column=dataset.output_column,
            sampled_locations=sampled_locations,
            started_at=started_at,
            warning=f"{type(exc).__name__}: {exc}",
        )

    valid_observations = int(dataframe["Value"].notna().sum()) if "Value" in dataframe else 0

    return DatasetValidationResult(
        dataset_key=dataset.key,
        parameter=dataset.parameter,
        output_column=dataset.output_column,
        dataframe=dataframe,
        sampled_locations=sampled_locations,
        valid_observations=valid_observations,
        missing_observations=max(sampled_locations - valid_observations, 0),
        execution_time_seconds=perf_counter() - started_at,
    )


def merge_environmental_dataframes(
    base_points: pd.DataFrame,
    dataset_results: list[DatasetValidationResult],
    date_range: DateRange = DEFAULT_DATE_RANGE,
) -> pd.DataFrame:
    merged = base_points.copy()
    merged["Date"] = date_range.start

    for result in dataset_results:
        if result.dataframe.empty:
            merged[result.output_column] = pd.NA
            continue

        parameter_frame = result.dataframe[["SampleID", "Value"]].rename(
            columns={"Value": result.output_column}
        )
        merged = merged.merge(parameter_frame, on="SampleID", how="left")

    return merged.drop(columns=["SampleID"])


def run_environmental_pipeline(
    dataset_keys: tuple[str, ...] = SUPPORTED_ENVIRONMENTAL_DATASET_KEYS,
    date_range: DateRange = DEFAULT_DATE_RANGE,
    sampling: SamplingConfig = DEFAULT_SAMPLING_CONFIG,
) -> EnvironmentalPipelineResult:
    started_at = perf_counter()
    aoi = load_aoi_geometry()
    sampling_points = create_sampling_points(aoi, sampling)
    base_points = sampling_points_to_dataframe(sampling_points, sampling)
    sampled_locations = len(base_points)

    if sampled_locations == 0:
        return EnvironmentalPipelineResult(
            dataframe=pd.DataFrame(columns=["Latitude", "Longitude", "Date"]),
            dataset_results=[],
            execution_time_seconds=perf_counter() - started_at,
        )

    dataset_results = [
        extract_dataset_at_points(
            dataset_key=dataset_key,
            aoi=aoi,
            sampling_points=sampling_points,
            sampled_locations=sampled_locations,
            date_range=date_range,
            sampling=sampling,
        )
        for dataset_key in dataset_keys
    ]

    dataframe = merge_environmental_dataframes(base_points, dataset_results, date_range)

    return EnvironmentalPipelineResult(
        dataframe=dataframe,
        dataset_results=dataset_results,
        execution_time_seconds=perf_counter() - started_at,
    )
