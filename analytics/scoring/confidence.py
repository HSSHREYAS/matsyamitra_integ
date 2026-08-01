from .categories import confidence_label
from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import ConfidenceResult, ScoringInput
from .normalization import to_valid_float


def freshness_factor(data_age_hours: float, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> float:
    for threshold in config.freshness_thresholds:
        if threshold.max_age_hours is None or data_age_hours <= threshold.max_age_hours:
            return threshold.factor
    return config.freshness_thresholds[-1].factor


def parameter_availability(
    record: ScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> dict[str, bool]:
    return {
        "sst": to_valid_float(record.sst, config.sst.valid_min, config.sst.valid_max) is not None,
        "chlorophyll": to_valid_float(
            record.chlorophyll,
            config.chlorophyll.valid_min,
            config.chlorophyll.valid_max,
        )
        is not None,
        "wind": to_valid_float(record.wind_speed, config.wind_pfz.valid_min, config.wind_pfz.valid_max)
        is not None,
        "wave": to_valid_float(record.wave_height, config.wave_risk.valid_min, config.wave_risk.valid_max)
        is not None,
    }


def calculate_confidence(
    record: ScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> ConfidenceResult:
    availability = parameter_availability(record, config)
    base_confidence = sum(
        config.confidence_weights[key]
        for key, available in availability.items()
        if available
    )
    freshness = freshness_factor(record.data_age_hours, config)
    score = round(base_confidence * freshness * 100.0, 1)

    return ConfidenceResult(
        score=score,
        label=confidence_label(score, config),
        availability=availability,
        freshness_factor=freshness,
    )
