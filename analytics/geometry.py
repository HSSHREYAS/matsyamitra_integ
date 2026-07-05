import json
from pathlib import Path
from typing import Any

import ee

from .config import AOI_PATH


def load_geojson(path: Path = AOI_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as geojson_file:
        return json.load(geojson_file)


def geojson_to_geometry(geojson: dict[str, Any]) -> ee.Geometry:
    geojson_type = geojson.get("type")

    if geojson_type == "FeatureCollection":
        return ee.FeatureCollection(geojson).geometry()

    if geojson_type == "Feature":
        return ee.Geometry(geojson["geometry"])

    return ee.Geometry(geojson)


def load_aoi_geometry(path: Path = AOI_PATH) -> ee.Geometry:
    return geojson_to_geometry(load_geojson(path))
