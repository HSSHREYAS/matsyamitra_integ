"""
Spatial Matching — INCOIS Advisory Coordinates → Canonical KARN Points.

Uses the Haversine formula to find the nearest Karnataka canonical sampling
location (KARN_001 … KARN_025) for each INCOIS advisory coordinate.

Canonical locations are loaded from sampling_points.geojson at import time
so they are always consistent with the database.

Usage:
    from analytics.incois.spatial import find_nearest_sampling_location

    result = find_nearest_sampling_location(latitude=13.5, longitude=74.2)
    if result:
        loc_id, karn_id, distance_km = result
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path to the canonical sampling points GeoJSON
_GEOJSON_PATH = (
    Path(__file__).resolve().parent.parent  # analytics/
    / "data"
    / "geometry"
    / "sampling_points.geojson"
)

# Maximum distance (km) to consider a match valid.
# Advisory coordinates more than this distance from any KARN point are
# recorded with nearest_sampling_location_id = NULL.
MAX_MATCH_DISTANCE_KM: float = 75.0

# Earth radius in kilometres
_EARTH_RADIUS_KM: float = 6371.0


@dataclass(frozen=True)
class CanonicalLocation:
    location_id: str   # e.g. "KARN_001"
    latitude: float
    longitude: float


# ---------------------------------------------------------------------------
# Load canonical locations once at module import
# ---------------------------------------------------------------------------

def _load_canonical_locations() -> list[CanonicalLocation]:
    """Load the 25 canonical Karnataka locations from sampling_points.geojson."""
    try:
        with open(_GEOJSON_PATH, "r", encoding="utf-8") as fh:
            geojson = json.load(fh)
        locations = [
            CanonicalLocation(
                location_id=feature["properties"]["location_id"],
                latitude=feature["properties"]["latitude"],
                longitude=feature["properties"]["longitude"],
            )
            for feature in geojson.get("features", [])
        ]
        logger.debug("Loaded %d canonical sampling locations.", len(locations))
        return locations
    except Exception as exc:
        logger.error("Failed to load sampling_points.geojson: %s", exc)
        return []


_CANONICAL_LOCATIONS: list[CanonicalLocation] = _load_canonical_locations()


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth (in km).

    Uses the Haversine formula. Input coordinates in decimal degrees.
    """
    lat1_r, lon1_r, lat2_r, lon2_r = map(math.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return _EARTH_RADIUS_KM * c


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SpatialMatchResult:
    """Result of matching an INCOIS advisory coordinate to a canonical location."""
    location_id: str       # e.g. "KARN_007"
    latitude: float        # canonical point latitude
    longitude: float       # canonical point longitude
    distance_km: float     # distance from advisory to canonical point


def find_nearest_sampling_location(
    latitude: float,
    longitude: float,
    max_distance_km: float = MAX_MATCH_DISTANCE_KM,
) -> Optional[SpatialMatchResult]:
    """
    Find the nearest canonical KARN sampling location to the given coordinates.

    Returns:
        SpatialMatchResult if a match within max_distance_km is found.
        None if no match within the distance threshold, or if no canonical
        locations are loaded.
    """
    if not _CANONICAL_LOCATIONS:
        logger.error("No canonical locations loaded — cannot perform spatial match.")
        return None

    best: Optional[tuple[float, CanonicalLocation]] = None

    for loc in _CANONICAL_LOCATIONS:
        dist = haversine_km(latitude, longitude, loc.latitude, loc.longitude)
        if best is None or dist < best[0]:
            best = (dist, loc)

    if best is None:
        return None

    best_dist, best_loc = best

    if best_dist > max_distance_km:
        logger.debug(
            "Nearest KARN point (%s) is %.1f km away — exceeds threshold of %.1f km. "
            "Recording without canonical location link.",
            best_loc.location_id,
            best_dist,
            max_distance_km,
        )
        return None

    logger.debug(
        "Matched (%.4f, %.4f) → %s (%.1f km)",
        latitude,
        longitude,
        best_loc.location_id,
        best_dist,
    )
    return SpatialMatchResult(
        location_id=best_loc.location_id,
        latitude=best_loc.latitude,
        longitude=best_loc.longitude,
        distance_km=best_dist,
    )


def match_all_records(
    records: list,
    max_distance_km: float = MAX_MATCH_DISTANCE_KM,
) -> list[tuple]:
    """
    Match a list of IncoisAdvisoryRecord objects to canonical locations.

    Returns:
        List of (record, SpatialMatchResult | None) tuples.
    """
    return [
        (record, find_nearest_sampling_location(record.latitude, record.longitude, max_distance_km))
        for record in records
    ]


def get_canonical_locations() -> list[CanonicalLocation]:
    """Return the list of loaded canonical sampling locations (for testing)."""
    return list(_CANONICAL_LOCATIONS)
