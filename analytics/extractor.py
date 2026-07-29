from dataclasses import dataclass

import ee

from .adapters import adapt_to_value_image, required_bands_for
from .config import DatasetConfig, DateRange
from .datasets import load_image_collection


@dataclass(frozen=True)
class ExtractedImage:
    image: ee.Image
    dataset: DatasetConfig
    date_range: DateRange


def filter_collection(
    dataset: DatasetConfig,
    aoi: ee.Geometry,
    date_range: DateRange,
) -> ee.ImageCollection:
    required_bands = required_bands_for(dataset)
    if not required_bands:
        raise ValueError(f"Dataset '{dataset.key}' does not have configured source bands.")

    return (
        load_image_collection(dataset)
        .filterDate(date_range.start, date_range.end)
        .filterBounds(aoi)
        .select(list(required_bands))
    )


def prepare_image(
    dataset: DatasetConfig,
    aoi: ee.Geometry,
    date_range: DateRange,
) -> ExtractedImage:
    image = ee.Image(
        filter_collection(dataset, aoi, date_range)
        .sort("system:time_start")
        .first()
    )

    normalized = (
        adapt_to_value_image(image, dataset)
        .clip(aoi)
        .set(
            {
                "dataset_key": dataset.key,
                "dataset_id": dataset.dataset_id,
                "parameter": dataset.parameter,
                "output_column": dataset.output_column,
                "sample_date": ee.Date(image.get("system:time_start")).format("YYYY-MM-dd"),
            }
        )
    )

    return ExtractedImage(image=normalized, dataset=dataset, date_range=date_range)
