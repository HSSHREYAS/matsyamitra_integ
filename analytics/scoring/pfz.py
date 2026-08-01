from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import ScoringInput, WeightedScore
from .normalization import (
    trapezoid_suitability,
    weighted_score_with_redistribution,
    wind_pfz_suitability,
)


def calculate_pfz(record: ScoringInput, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> WeightedScore:
    normalized_values = {
        "sst": trapezoid_suitability(record.sst, config.sst),
        "chlorophyll": trapezoid_suitability(record.chlorophyll, config.chlorophyll),
        "wind": wind_pfz_suitability(record.wind_speed, config.wind_pfz),
    }
    score, adjusted_weights = weighted_score_with_redistribution(
        normalized_values,
        config.pfz_weights,
    )

    return WeightedScore(
        score=score,
        normalized_values=normalized_values,
        adjusted_weights=adjusted_weights,
    )
