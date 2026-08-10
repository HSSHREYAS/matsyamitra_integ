from typing import Any

from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import WeightedScore
from .normalization import (
    trapezoid_suitability,
    weighted_score_with_redistribution,
)


def calculate_pfz(record: Any, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> WeightedScore:
    normalized_values = {
        "sst": trapezoid_suitability(record.sst, config.sst),
        "chlorophyll": trapezoid_suitability(record.chlorophyll, config.chlorophyll),
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
