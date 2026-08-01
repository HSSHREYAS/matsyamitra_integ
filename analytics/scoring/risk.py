from .config import DEFAULT_SCORING_CONFIG, ScoringConfig
from .models import ScoringInput, WeightedScore
from .normalization import rising_risk_index, weighted_score_with_redistribution


def calculate_risk(record: ScoringInput, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> WeightedScore:
    risk_values = {
        "wave": rising_risk_index(record.wave_height, config.wave_risk),
        "wind": rising_risk_index(record.wind_speed, config.wind_risk),
    }
    score, adjusted_weights = weighted_score_with_redistribution(
        risk_values,
        config.risk_weights,
    )

    return WeightedScore(
        score=score,
        normalized_values=risk_values,
        adjusted_weights=adjusted_weights,
    )
