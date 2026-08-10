import json
from typing import Any

import ee
import pandas as pd

from .config import SAMPLING_POINTS_PATH, SamplingConfig
from .extractor import ExtractedImage


FRAME_COLUMNS = [
    "SampleID",
    "location_id",
    "Latitude",
    "Longitude",
    "Date",
    "Parameter",
    "Value",
    "Dataset",
    "OutputColumn",
    "SourceTimestamp",
]
POINT_COLUMNS = ["SampleID", "location_id", "Latitude", "Longitude"]


def create_sampling_points(aoi: ee.Geometry, sampling: SamplingConfig) -> ee.FeatureCollection:
    if not SAMPLING_POINTS_PATH.exists():
        raise RuntimeError(f"Canonical sampling locations not found at {SAMPLING_POINTS_PATH}")

    features = []
    data = json.loads(SAMPLING_POINTS_PATH.read_text(encoding="utf-8"))
    for index, feature in enumerate(data.get("features", [])):
        properties = feature.get("properties") or {}
        coordinates = (feature.get("geometry") or {}).get("coordinates")
        if coordinates is None:
            continue

        longitude, latitude = coordinates
        sample_id = str(index)
        features.append(
            ee.Feature(
                ee.Geometry.Point([longitude, latitude]),
                {
                    "SampleID": sample_id,
                    "location_id": properties.get("location_id", f"KARN_{index + 1:03d}"),
                },
            )
        )

    if not features:
        raise RuntimeError("No valid features found in canonical geojson.")

    return ee.FeatureCollection(features[: sampling.sample_limit])


def sampling_points_to_dataframe(
    sampling_points: ee.FeatureCollection,
    sampling: SamplingConfig,
) -> pd.DataFrame:
    features = sampling_points.getInfo().get("features", [])
    rows = []

    for feature in features:
        coordinates = (feature.get("geometry") or {}).get("coordinates")
        if coordinates is None:
            continue

        longitude, latitude = coordinates
        rows.append(
            {
                "SampleID": str((feature.get("properties") or {}).get("SampleID")),
                "location_id": (feature.get("properties") or {}).get("location_id"),
                "Latitude": round(latitude, sampling.coordinate_precision),
                "Longitude": round(longitude, sampling.coordinate_precision),
            }
        )

    return pd.DataFrame(rows, columns=POINT_COLUMNS)


def _feature_to_row(
    feature: dict[str, Any],
    extracted: ExtractedImage,
    sample_date: str,
    source_timestamp: int | None,
    sampling: SamplingConfig,
) -> dict[str, Any] | None:
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates")
    properties = feature.get("properties") or {}
    value = properties.get("value")

    if coordinates is None or value is None:
        return None

    longitude, latitude = coordinates

    return {
        "SampleID": str(properties.get("SampleID")),
        "location_id": properties.get("location_id"),
        "Latitude": round(latitude, sampling.coordinate_precision),
        "Longitude": round(longitude, sampling.coordinate_precision),
        "Date": sample_date,
        "Parameter": extracted.dataset.parameter,
        "Value": value,
        "Dataset": extracted.dataset.dataset_id,
        "OutputColumn": extracted.dataset.output_column,
        "SourceTimestamp": source_timestamp,
    }


def sample_image_to_dataframe(
    extracted: ExtractedImage,
    aoi: ee.Geometry,
    sampling: SamplingConfig,
) -> pd.DataFrame:
    sampling_points = create_sampling_points(aoi, sampling)
    return sample_image_at_points(extracted, sampling_points, sampling)


def sample_image_at_points(
    extracted: ExtractedImage,
    sampling_points: ee.FeatureCollection,
    sampling: SamplingConfig,
) -> pd.DataFrame:
    sample = extracted.image.sampleRegions(
        collection=sampling_points,
        scale=sampling.scale_meters,
        geometries=sampling.include_geometries,
        tileScale=sampling.tile_scale,
    )

    sample_date = extracted.image.get("sample_date").getInfo()
    source_timestamp = extracted.image.get("SourceTimestamp").getInfo()
    features = sample.getInfo().get("features", [])
    rows = [
        row
        for feature in features
        if (row := _feature_to_row(feature, extracted, sample_date, source_timestamp, sampling)) is not None
    ]

    return pd.DataFrame(rows, columns=FRAME_COLUMNS)
