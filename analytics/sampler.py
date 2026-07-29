from typing import Any

import ee
import pandas as pd

from .config import SamplingConfig
from .extractor import ExtractedImage


FRAME_COLUMNS = [
    "SampleID",
    "Latitude",
    "Longitude",
    "Date",
    "Parameter",
    "Value",
    "Dataset",
    "OutputColumn",
]
POINT_COLUMNS = ["SampleID", "Latitude", "Longitude"]


def create_sampling_points(aoi: ee.Geometry, sampling: SamplingConfig) -> ee.FeatureCollection:
    points = ee.FeatureCollection.randomPoints(
        region=aoi,
        points=sampling.sample_limit,
        seed=sampling.seed,
        maxError=sampling.scale_meters,
    )
    point_list = points.toList(sampling.sample_limit)

    def with_sample_id(index: ee.Number) -> ee.Feature:
        feature = ee.Feature(point_list.get(index))
        return feature.set("SampleID", ee.Number(index).format("%d"))

    return ee.FeatureCollection(ee.List.sequence(0, sampling.sample_limit - 1).map(with_sample_id))


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
                "Latitude": round(latitude, sampling.coordinate_precision),
                "Longitude": round(longitude, sampling.coordinate_precision),
            }
        )

    return pd.DataFrame(rows, columns=POINT_COLUMNS)


def _feature_to_row(
    feature: dict[str, Any],
    extracted: ExtractedImage,
    sample_date: str,
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
        "Latitude": round(latitude, sampling.coordinate_precision),
        "Longitude": round(longitude, sampling.coordinate_precision),
        "Date": sample_date,
        "Parameter": extracted.dataset.parameter,
        "Value": value,
        "Dataset": extracted.dataset.dataset_id,
        "OutputColumn": extracted.dataset.output_column,
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
    features = sample.getInfo().get("features", [])
    rows = [
        row
        for feature in features
        if (row := _feature_to_row(feature, extracted, sample_date, sampling)) is not None
    ]

    return pd.DataFrame(rows, columns=FRAME_COLUMNS)
