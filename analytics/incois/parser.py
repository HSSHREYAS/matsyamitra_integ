"""
INCOIS Advisory HTML Parser.

Parses the fully rendered HTML from the INCOIS TextData page and extracts
structured advisory records. Each record represents one Potential Fishing Zone
announced for a landing center, with coordinates and navigation details.

Expected advisory table headers (INCOIS format):
    Landing Center | Bearing (°) | Distance (km) | Depth (m) | Latitude | Longitude

Returns an empty list when:
- No advisory is issued today (monsoon ban, cloud cover, holidays)
- The HTML does not contain a recognizable advisory table
- Parsing fails non-fatally

Advisory data format notes:
- Latitude/Longitude: decimal degrees (e.g. 13.50, 74.20)
- Bearing: compass degrees 0–360
- Distance: km from landing center
- Depth: meters at the PFZ location
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# Column header keywords used to identify the advisory table
# These are checked case-insensitively against <th> or header <td> text
_EXPECTED_HEADERS = {"latitude", "longitude"}
_OPTIONAL_HEADERS = {"landing", "bearing", "distance", "depth"}
_DMS_RE = re.compile(
    r"^\s*(?P<deg>\d+(?:\.\d+)?)\s+(?P<min>\d+(?:\.\d+)?)\s+(?P<sec>\d+(?:\.\d+)?)\s*(?P<hem>[NSEW])\s*$",
    re.IGNORECASE,
)
_DM_RE = re.compile(
    r"^\s*(?P<deg>\d+(?:\.\d+)?)\s+(?P<min>\d+(?:\.\d+)?)\s*(?P<hem>[NSEW])\s*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class IncoisAdvisoryRecord:
    """
    A single Potential Fishing Zone advisory entry scraped from INCOIS.

    Phase 1: Contains only advisory zone data (no SST/Chlorophyll).
    Phase 2 (future): Will be enriched with GEE environmental data.
    """

    landing_center: str
    bearing_degrees: Optional[float]   # compass degrees from landing center
    distance_km: Optional[float]       # km from landing center
    depth_m: Optional[float]           # sea depth at zone in meters
    latitude: float                    # PFZ latitude (decimal degrees)
    longitude: float                   # PFZ longitude (decimal degrees)
    raw_row_text: str                  # original text for audit trail
    advisory_date: date                # date advisory was scraped/issued


def parse_advisory_html(html: str, advisory_date: Optional[date] = None) -> list[IncoisAdvisoryRecord]:
    """
    Parse rendered INCOIS TextData HTML and extract advisory records.

    Args:
        html: Fully rendered HTML string from Playwright scraper.
        advisory_date: The date to stamp on each record. Defaults to today (UTC).

    Returns:
        List of IncoisAdvisoryRecord. Empty list if no advisory data found.
    """
    if not html:
        logger.warning("Empty HTML passed to parser.")
        return []

    if advisory_date is None:
        advisory_date = datetime.now(timezone.utc).date()

    soup = BeautifulSoup(html, "lxml")

    # 1. Try to detect "no advisory" messages before looking for tables
    if _detect_no_advisory(soup):
        logger.info("INCOIS page indicates no advisory issued today.")
        return []

    # 2. Find the advisory table
    table = _find_advisory_table(soup)
    if table is None:
        logger.warning("No advisory table found in INCOIS HTML.")
        return []

    # 3. Parse column mapping from headers
    col_map = _build_column_map(table)
    if col_map is None:
        logger.warning("Could not map advisory table columns from headers.")
        return []

    # 4. Extract data rows
    records = _extract_rows(table, col_map, advisory_date)
    logger.info("Parsed %d advisory record(s) from INCOIS page.", len(records))
    return records


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _detect_no_advisory(soup: BeautifulSoup) -> bool:
    """Return True if the page content indicates no advisory is available today."""
    no_advisory_phrases = [
        "no advisory",
        "not available",
        "no potential fishing zone",
        "trawling ban",
        "fishing ban",
        "no pfz",
        "advisory not issued",
    ]
    page_text = soup.get_text(separator=" ").lower()
    for phrase in no_advisory_phrases:
        if phrase in page_text:
            logger.debug("No-advisory phrase detected: '%s'", phrase)
            return True
    return False


def _find_advisory_table(soup: BeautifulSoup) -> Optional[Tag]:
    """
    Find the HTML table containing the PFZ advisory data.

    Strategy:
    1. Prefer the live sector table with bearing / latitude / longitude.
    2. Fall back to any table containing latitude and longitude text.
    3. As a last resort, return the largest table on the page.
    """
    tables = soup.find_all("table")
    if not tables:
        return None

    for table in tables:
        header_text = " ".join(
            cell.get_text(strip=True).lower()
            for row in table.find_all("tr")[:4]
            for cell in row.find_all(["th", "td"])
        )
        if (
            ("bearing" in header_text or "direction" in header_text)
            and "latitude" in header_text
            and "longitude" in header_text
        ):
            logger.debug("Found advisory table via live header keywords.")
            return table

    for table in tables:
        cell_text = table.get_text(separator=" ").lower()
        if (
            "latitude" in cell_text
            and "longitude" in cell_text
            and ("bearing" in cell_text or "direction" in cell_text)
        ):
            logger.debug("Found advisory table via live cell-level keyword scan.")
            return table

    for table in tables:
        cell_text = table.get_text(separator=" ").lower()
        if "latitude" in cell_text and "longitude" in cell_text:
            logger.debug("Found advisory table via latitude/longitude fallback.")
            return table

    largest = max(tables, key=lambda t: len(t.get_text()))
    logger.debug("Falling back to largest table in page.")
    return largest


def _build_column_map(table: Tag) -> Optional[dict[str, int]]:
    """
    Parse the header row of the advisory table and return a mapping of
    canonical field name → column index.

    Returns None if required columns (latitude, longitude) are not found.
    """
    rows = table.find_all("tr")
    if not rows:
        return None

    for row in rows[:4]:
        cells = row.find_all(["th", "td"])
        if not cells:
            continue

        headers = [cell.get_text(strip=True).lower() for cell in cells]
        col_map: dict[str, int] = {}

        for i, h in enumerate(headers):
            if "latitude" in h or "lat" == h:
                col_map["latitude"] = i
            elif "longitude" in h or "lon" == h or "long" == h:
                col_map["longitude"] = i
            elif "landing" in h or "center" in h or "centre" in h or "place" in h or "coast" in h:
                col_map["landing_center"] = i
            elif "bearing" in h or "direction" in h or "degree" in h:
                col_map["bearing_degrees"] = i
            elif "distance" in h or "dist" == h:
                col_map["distance_km"] = i
            elif "depth" in h:
                col_map["depth_m"] = i

        if "latitude" in col_map and "longitude" in col_map:
            logger.debug("Column map built: %s", col_map)
            return col_map

    return None


def _extract_rows(
    table: Tag,
    col_map: dict[str, int],
    advisory_date: date,
) -> list[IncoisAdvisoryRecord]:
    """Extract data rows from the advisory table using the column map."""
    records: list[IncoisAdvisoryRecord] = []
    rows = table.find_all("tr")

    for row in rows:
        cells = row.find_all(["td", "th"])
        if not cells:
            continue

        if len(cells) <= max(col_map.get("latitude", 0), col_map.get("longitude", 0)):
            continue

        lat_raw = _cell_text(cells, col_map.get("latitude"))
        lon_raw = _cell_text(cells, col_map.get("longitude"))

        lat = _parse_coordinate(lat_raw)
        lon = _parse_coordinate(lon_raw)

        if lat is None or lon is None:
            continue

        # Basic sanity: Karnataka coast is roughly 12°N–15°N, 72°E–75°E
        if not (10.0 <= lat <= 20.0 and 70.0 <= lon <= 80.0):
            logger.debug("Skipping out-of-range coordinates: lat=%s lon=%s", lat, lon)
            continue

        landing_center = _cell_text(cells, col_map.get("landing_center")) or "Unknown"
        bearing_raw = _cell_text(cells, col_map.get("bearing_degrees"))
        distance_raw = _cell_text(cells, col_map.get("distance_km"))
        depth_raw = _cell_text(cells, col_map.get("depth_m"))

        raw_text = " | ".join(c.get_text(strip=True) for c in cells)

        records.append(
            IncoisAdvisoryRecord(
                landing_center=landing_center.strip(),
                bearing_degrees=_parse_range_float(bearing_raw),
                distance_km=_parse_range_float(distance_raw),
                depth_m=_parse_range_float(depth_raw),
                latitude=lat,
                longitude=lon,
                raw_row_text=raw_text,
                advisory_date=advisory_date,
            )
        )

    return records


def _cell_text(cells: list[Tag], index: Optional[int]) -> Optional[str]:
    """Safely get text from a list of cells by index."""
    if index is None or index >= len(cells):
        return None
    return cells[index].get_text(strip=True) or None


def _parse_coordinate(value: Optional[str]) -> Optional[float]:
    """Parse either decimal degrees or DMS/DM coordinates into decimal degrees."""
    if not value:
        return None

    dms = _parse_dms(value)
    if dms is not None:
        return dms

    return _parse_float(value)


def _parse_dms(value: str) -> Optional[float]:
    """Parse coordinates like '14 49 58 N' or '14 49 N' into decimal degrees."""
    normalized = re.sub(r"[°º′’'\"]", " ", value)
    normalized = " ".join(normalized.split())

    match = _DMS_RE.match(normalized)
    if match is None:
        match = _DM_RE.match(normalized)
    if match is None:
        return None

    degrees = float(match.group("deg"))
    minutes = float(match.group("min"))
    seconds = float(match.groupdict().get("sec") or 0.0)
    hemisphere = (match.group("hem") or "").upper()

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if hemisphere in {"S", "W"}:
        decimal *= -1.0
    return decimal


def _parse_range_float(value: Optional[str]) -> Optional[float]:
    """Parse a single numeric value or a range like '21-26' as a midpoint."""
    if not value:
        return None

    cleaned = value.strip().replace(",", ".")
    if "-" in cleaned:
        parts = [part.strip() for part in re.split(r"\s*-\s*", cleaned) if part.strip()]
        if len(parts) >= 2:
            try:
                start = float(re.sub(r"[^\d.]", "", parts[0]))
                end = float(re.sub(r"[^\d.]", "", parts[1]))
                return (start + end) / 2.0
            except ValueError:
                pass

    numbers = [float(part) for part in re.findall(r"\d+(?:\.\d+)?", cleaned)]
    if not numbers:
        return None

    return numbers[0]


def _parse_float(value: Optional[str]) -> Optional[float]:
    """
    Parse a float from a string, handling common INCOIS formatting:
    - Strips degree symbols, N/S/E/W suffixes
    - Handles both '.' and ',' as decimal separator
    """
    if not value:
        return None
    cleaned = re.sub(r"[^\d.\-,]", "", value.replace(",", "."))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None
