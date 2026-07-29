import ee

from .config import DatasetConfig


class DatasetAdapter:
    def required_bands(self, dataset: DatasetConfig) -> tuple[str, ...]:
        if dataset.source_bands:
            return dataset.source_bands

        if dataset.value_band:
            return (dataset.value_band,)

        return ()

    def to_value_image(self, image: ee.Image, dataset: DatasetConfig) -> ee.Image:
        raise NotImplementedError

    def apply_scale_and_offset(self, image: ee.Image, dataset: DatasetConfig) -> ee.Image:
        value_image = image

        if dataset.value_scale != 1.0:
            value_image = value_image.multiply(dataset.value_scale)

        if dataset.value_offset != 0.0:
            value_image = value_image.add(dataset.value_offset)

        return value_image.rename("value")


class SingleBandAdapter(DatasetAdapter):
    def to_value_image(self, image: ee.Image, dataset: DatasetConfig) -> ee.Image:
        selected = image.select([dataset.value_band], ["value"])
        return self.apply_scale_and_offset(selected, dataset)


class WindSpeedAdapter(DatasetAdapter):
    def to_value_image(self, image: ee.Image, dataset: DatasetConfig) -> ee.Image:
        u_band, v_band = dataset.source_bands
        wind_speed = image.expression(
            "sqrt((u * u) + (v * v))",
            {
                "u": image.select(u_band),
                "v": image.select(v_band),
            },
        )
        return self.apply_scale_and_offset(wind_speed, dataset)


ADAPTERS: dict[str, DatasetAdapter] = {
    "single_band": SingleBandAdapter(),
    "wind_speed": WindSpeedAdapter(),
}


def get_adapter(dataset: DatasetConfig) -> DatasetAdapter:
    try:
        return ADAPTERS[dataset.adapter]
    except KeyError as exc:
        available = ", ".join(sorted(ADAPTERS))
        raise KeyError(f"Unknown adapter '{dataset.adapter}'. Available adapters: {available}") from exc


def required_bands_for(dataset: DatasetConfig) -> tuple[str, ...]:
    return get_adapter(dataset).required_bands(dataset)


def adapt_to_value_image(image: ee.Image, dataset: DatasetConfig) -> ee.Image:
    return get_adapter(dataset).to_value_image(image, dataset)
