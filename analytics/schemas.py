from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class EnvironmentalRecord:
    latitude: float
    longitude: float
    date: datetime
    sst: float | None
    wind_speed: float | None
    wave_height: float | None
    chlorophyll: float | None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "EnvironmentalRecord":
        date_value = row["Date"]
        if not isinstance(date_value, datetime):
            date_value = datetime.fromisoformat(str(date_value))

        return cls(
            latitude=float(row["Latitude"]),
            longitude=float(row["Longitude"]),
            date=date_value,
            sst=_optional_float(row.get("SST")),
            wind_speed=_optional_float(row.get("WindSpeed")),
            wave_height=_optional_float(row.get("WaveHeight")),
            chlorophyll=_optional_float(row.get("Chlorophyll")),
        )


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        if value != value:
            return None
    except TypeError:
        return None

    return float(value)
