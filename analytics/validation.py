import argparse

import ee
import pandas as pd

from .config import (
    DEFAULT_DATE_RANGE,
    DEFAULT_SAMPLING_CONFIG,
    DateRange,
    EARTH_ENGINE_PROJECT_ID,
    SamplingConfig,
)
from .datasets import get_dataset_config
from .extractor import prepare_image
from .geometry import load_aoi_geometry
from .pipeline import run_environmental_pipeline
from .sampler import sample_image_to_dataframe
from .temporal import describe_temporal_window


VALIDATION_DATASET_KEY = "sst_noaa_oisst"


def initialize_earth_engine(project_id: str = EARTH_ENGINE_PROJECT_ID) -> None:
    ee.Initialize(project=project_id)


def run_validation(dataset_key: str = VALIDATION_DATASET_KEY) -> pd.DataFrame:
    initialize_earth_engine()
    aoi = load_aoi_geometry()
    dataset = get_dataset_config(dataset_key)
    extracted = prepare_image(dataset, aoi, DEFAULT_DATE_RANGE)
    dataframe = sample_image_to_dataframe(extracted, aoi, DEFAULT_SAMPLING_CONFIG)

    if dataframe.empty:
        raise RuntimeError("Validation completed but returned an empty DataFrame.")

    return dataframe


def build_missing_value_statistics(dataframe: pd.DataFrame) -> pd.DataFrame:
    if dataframe.empty:
        return pd.DataFrame(columns=["Column", "MissingCount", "MissingPercent"])

    missing_counts = dataframe.isna().sum()
    missing_percent = (missing_counts / len(dataframe) * 100).round(2)

    return pd.DataFrame(
        {
            "Column": missing_counts.index,
            "MissingCount": missing_counts.values,
            "MissingPercent": missing_percent.values,
        }
    )


def run_phase2_validation(
    date_range: DateRange = DEFAULT_DATE_RANGE,
    sampling: SamplingConfig = DEFAULT_SAMPLING_CONFIG,
) -> pd.DataFrame:
    try:
        initialize_earth_engine()
    except Exception as exc:
        print(f"Authentication or Earth Engine initialization failed: {type(exc).__name__}: {exc}")
        return pd.DataFrame()

    result = run_environmental_pipeline(date_range=date_range, sampling=sampling)

    print("Phase 2 validation configuration")
    print(f"- {describe_temporal_window(date_range)}")
    print(f"- sampling_resolution={sampling.scale_meters}m")
    print(f"- requested_sample_locations={sampling.sample_limit}")
    print()

    print("Independent dataset validation")
    for dataset_result in result.dataset_results:
        print(
            f"- {dataset_result.output_column}: "
            f"sampled={dataset_result.sampled_locations}, "
            f"valid={dataset_result.valid_observations}, "
            f"missing={dataset_result.missing_observations}, "
            f"time={dataset_result.execution_time_seconds:.2f}s"
        )
        if dataset_result.warning:
            print(f"  warning={dataset_result.warning}")

    print("\nMerged DataFrame validation")
    print(f"- sampled_locations={len(result.dataframe)}")
    print(f"- execution_time={result.execution_time_seconds:.2f}s")
    print("- missing_value_statistics:")
    print(build_missing_value_statistics(result.dataframe).to_string(index=False))
    print("\nPreview")
    print(result.dataframe.head().to_string(index=False))

    return result.dataframe


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the MatsyaMitra Phase 2 unified environmental pipeline."
    )
    parser.add_argument(
        "--start-date",
        default=DEFAULT_DATE_RANGE.start,
        help="Inclusive Earth Engine filter start date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--end-date",
        default=DEFAULT_DATE_RANGE.end,
        help="Exclusive Earth Engine filter end date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--sample-limit",
        type=int,
        default=DEFAULT_SAMPLING_CONFIG.sample_limit,
        help="Number of shared geographical sampling locations.",
    )
    parser.add_argument(
        "--scale-meters",
        type=int,
        default=DEFAULT_SAMPLING_CONFIG.scale_meters,
        help="Earth Engine sampling scale in meters.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_phase2_validation(
        date_range=DateRange(start=args.start_date, end=args.end_date),
        sampling=SamplingConfig(
            scale_meters=args.scale_meters,
            sample_limit=args.sample_limit,
            seed=DEFAULT_SAMPLING_CONFIG.seed,
            tile_scale=DEFAULT_SAMPLING_CONFIG.tile_scale,
            include_geometries=DEFAULT_SAMPLING_CONFIG.include_geometries,
            coordinate_precision=DEFAULT_SAMPLING_CONFIG.coordinate_precision,
        ),
    )


if __name__ == "__main__":
    main()
