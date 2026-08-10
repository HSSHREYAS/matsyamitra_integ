from .categories import pfz_category, confidence_label
from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import PfzScoringInput, PfzScoredResult, ConfidenceResult
from .normalization import to_valid_float
from .pfz import calculate_pfz


def _freshness_factor(data_age_hours: float, config: ScoringConfig) -> float:
    for threshold in config.freshness_thresholds:
        if threshold.max_age_hours is None or data_age_hours <= threshold.max_age_hours:
            return threshold.factor
    return config.freshness_thresholds[-1].factor


def calculate_pfz_confidence(
    record: PfzScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> ConfidenceResult:
    availability = {
        "sst": to_valid_float(record.sst, config.sst.valid_min, config.sst.valid_max) is not None,
        "chlorophyll": to_valid_float(
            record.chlorophyll,
            config.chlorophyll.valid_min,
            config.chlorophyll.valid_max,
        )
        is not None,
    }
    
    base_confidence = 0.0
    confidence_sum = 0.0
    
    if availability["sst"]:
        base_confidence += config.pfz_confidence_weights["sst"]
        sst_age = record.sst_data_age_hours if record.sst_data_age_hours is not None else 0.0
        confidence_sum += config.pfz_confidence_weights["sst"] * _freshness_factor(sst_age, config)
        
    if availability["chlorophyll"]:
        base_confidence += config.pfz_confidence_weights["chlorophyll"]
        chl_age = record.chlorophyll_data_age_hours if record.chlorophyll_data_age_hours is not None else 0.0
        confidence_sum += config.pfz_confidence_weights["chlorophyll"] * _freshness_factor(chl_age, config)

    effective_freshness = confidence_sum / base_confidence if base_confidence > 0 else 0.0
    score = round(confidence_sum * 100.0, 1)

    return ConfidenceResult(
        score=score,
        label=confidence_label(score, config),
        availability=availability,
        freshness_factor=effective_freshness,
    )


def score_pfz_record(
    record: PfzScoringInput,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
    analytics_version: str = "deterministic-v1",
) -> PfzScoredResult:
    pfz = calculate_pfz(record, config)
    confidence = calculate_pfz_confidence(record, config)

    return PfzScoredResult(
        sampling_location_id=record.sampling_location_id,
        observation_date=record.observation_date,
        sst=record.sst,
        chlorophyll=record.chlorophyll,
        pfz_score=pfz.score,
        pfz_category=pfz_category(pfz.score, config),
        confidence_score=confidence.score,
        analytics_version=analytics_version,
        environmental_observation_id=record.environmental_observation_id,
        source="gee",
    )
