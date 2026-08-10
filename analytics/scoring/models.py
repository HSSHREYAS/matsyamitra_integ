from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class ScoringInput:
    latitude: float
    longitude: float
    date: datetime
    sst: float | None
    wind_speed: float | None
    wave_height: float | None
    chlorophyll: float | None
    data_age_hours: float = 0.0


@dataclass(frozen=True)
class WeightedScore:
    score: float | None
    normalized_values: dict[str, float | None]
    adjusted_weights: dict[str, float]


@dataclass(frozen=True)
class ConfidenceResult:
    score: float
    label: str
    availability: dict[str, bool]
    freshness_factor: float


@dataclass(frozen=True)
class ScoredObservation:
    latitude: float
    longitude: float
    date: datetime
    sst: float | None
    wind_speed: float | None
    wave_height: float | None
    chlorophyll: float | None
    pfz_score: float | None
    pfz_category: str
    risk_score: float | None
    risk_category: str
    confidence_score: float
    confidence_label: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "Latitude": self.latitude,
            "Longitude": self.longitude,
            "Date": self.date,
            "SST": self.sst,
            "WindSpeed": self.wind_speed,
            "WaveHeight": self.wave_height,
            "Chlorophyll": self.chlorophyll,
            "PFZScore": self.pfz_score,
            "PFZCategory": self.pfz_category,
            "RiskScore": self.risk_score,
            "RiskCategory": self.risk_category,
            "ConfidenceScore": self.confidence_score,
            "ConfidenceLabel": self.confidence_label,
            "Explanation": self.explanation,
        }


@dataclass(frozen=True)
class PfzScoringInput:
    sampling_location_id: int
    observation_date: date
    sst: float | None
    chlorophyll: float | None
    environmental_observation_id: int | None = None
    data_age_hours: float = 0.0


@dataclass(frozen=True)
class PfzScoredResult:
    sampling_location_id: int
    observation_date: date
    sst: float | None
    chlorophyll: float | None
    pfz_score: float | None
    pfz_category: str
    confidence_score: float
    analytics_version: str
    environmental_observation_id: int | None = None
    source: str = "gee"


@dataclass(frozen=True)
class RiskScoringInput:
    sampling_location_id: int
    observation_timestamp: datetime
    wind_speed: float | None
    wave_height: float | None
    marine_observation_id: int | None = None
    source: str = "open-meteo"
    data_age_hours: float = 0.0


@dataclass(frozen=True)
class RiskScoredResult:
    sampling_location_id: int
    observation_timestamp: datetime
    wind_speed: float | None
    wave_height: float | None
    risk_score: float | None
    risk_category: str
    confidence_score: float
    analytics_version: str
    marine_observation_id: int | None = None
    source: str = "open-meteo"
