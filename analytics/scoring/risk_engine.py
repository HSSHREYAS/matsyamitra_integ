from .categories import risk_category, confidence_label
from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import RiskScoringInput, RiskScoredResult, ConfidenceResult
from .normalization import to_valid_float
from .risk import calculate_risk


def _freshness_factor(data_age_hours: float, config: ScoringConfig) -> float:
    for threshold in config.freshness_thresholds:
        if threshold.max_age_hours is None or data_age_hours <= threshold.max_age_hours:
            return threshold.factor
    return config.freshness_thresholds[-1].factor


def calculate_risk_confidence(
    record: RiskScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> ConfidenceResult:
    availability = {
        "wind": to_valid_float(record.wind_speed, config.wind_risk.valid_min, config.wind_risk.valid_max) is not None,
        "wave": to_valid_float(record.wave_height, config.wave_risk.valid_min, config.wave_risk.valid_max) is not None,
    }
    
    base_confidence = sum(
        config.risk_confidence_weights[key]
        for key, available in availability.items()
        if available
    )
    
    freshness = _freshness_factor(record.data_age_hours, config)
    score = round(base_confidence * freshness * 100.0, 1)

    return ConfidenceResult(
        score=score,
        label=confidence_label(score, config),
        availability=availability,
        freshness_factor=freshness,
    )


def score_risk_record(
    record: RiskScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
    analytics_version: str = "deterministic-v1",
) -> RiskScoredResult:
    risk = calculate_risk(record, config)
    confidence = calculate_risk_confidence(record, config)

    return RiskScoredResult(
        sampling_location_id=record.sampling_location_id,
        observation_timestamp=record.observation_timestamp,
        wind_speed=record.wind_speed,
        wave_height=record.wave_height,
        risk_score=risk.score,
        risk_category=risk_category(risk.score, config),
        confidence_score=confidence.score,
        analytics_version=analytics_version,
        marine_observation_id=record.marine_observation_id,
        source=record.source,
    )
