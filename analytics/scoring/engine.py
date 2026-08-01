from dataclasses import asdict, is_dataclass
from datetime import datetime
from typing import Any

import pandas as pd

from analytics.schemas import EnvironmentalRecord

from .categories import pfz_category, risk_category
from .confidence import calculate_confidence
from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .explain import build_explanation
from .models import ScoredObservation, ScoringInput
from .pfz import calculate_pfz
from .risk import calculate_risk


def score_record(
    record: ScoringInput | EnvironmentalRecord | dict[str, Any],
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> ScoredObservation:
    scoring_input = coerce_scoring_input(record)
    pfz = calculate_pfz(scoring_input, config)
    risk = calculate_risk(scoring_input, config)
    confidence = calculate_confidence(scoring_input, config)
    explanation = build_explanation(scoring_input, pfz, risk, confidence)

    return ScoredObservation(
        latitude=scoring_input.latitude,
        longitude=scoring_input.longitude,
        date=scoring_input.date,
        sst=scoring_input.sst,
        wind_speed=scoring_input.wind_speed,
        wave_height=scoring_input.wave_height,
        chlorophyll=scoring_input.chlorophyll,
        pfz_score=pfz.score,
        pfz_category=pfz_category(pfz.score, config),
        risk_score=risk.score,
        risk_category=risk_category(risk.score, config),
        confidence_score=confidence.score,
        confidence_label=confidence.label,
        explanation=explanation,
    )


def score_dataframe(
    dataframe: pd.DataFrame,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> pd.DataFrame:
    scored_rows = [
        score_record(row.to_dict(), config).to_dict()
        for _, row in dataframe.iterrows()
    ]
    return pd.DataFrame(scored_rows)


def coerce_scoring_input(record: ScoringInput | EnvironmentalRecord | dict[str, Any]) -> ScoringInput:
    if isinstance(record, ScoringInput):
        return record

    if isinstance(record, EnvironmentalRecord):
        return ScoringInput(
            latitude=record.latitude,
            longitude=record.longitude,
            date=record.date,
            sst=record.sst,
            wind_speed=record.wind_speed,
            wave_height=record.wave_height,
            chlorophyll=record.chlorophyll,
        )

    if is_dataclass(record):
        return coerce_scoring_input(asdict(record))

    return ScoringInput(
        latitude=float(_get(record, "Latitude", "latitude")),
        longitude=float(_get(record, "Longitude", "longitude")),
        date=_coerce_datetime(_get(record, "Date", "date")),
        sst=_optional_float(_get(record, "SST", "sst", default=None)),
        wind_speed=_optional_float(_get(record, "WindSpeed", "wind_speed", default=None)),
        wave_height=_optional_float(_get(record, "WaveHeight", "wave_height", default=None)),
        chlorophyll=_optional_float(_get(record, "Chlorophyll", "chlorophyll", default=None)),
        data_age_hours=float(_get(record, "DataAgeHours", "data_age_hours", default=0.0)),
    )


def _get(record: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in record:
            return record[key]
    return default


def _coerce_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def _optional_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    return float(value)
