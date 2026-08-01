from .config import DEFAULT_SCORING_CONFIG, ScoreCategory, ScoringConfig


def descending_category(
    score: float | None,
    categories: tuple[ScoreCategory, ...],
    unknown_label: str = "Unknown",
) -> str:
    if score is None:
        return unknown_label

    for category in categories:
        if category.min_value is not None and score >= category.min_value:
            return category.label

    return unknown_label


def bounded_category(
    score: float | None,
    categories: tuple[ScoreCategory, ...],
    unknown_label: str = "Unknown",
) -> str:
    if score is None:
        return unknown_label

    for category in categories:
        min_ok = category.min_value is None or score >= category.min_value
        max_ok = category.max_value is None or score <= category.max_value
        if min_ok and max_ok:
            return category.label

    return unknown_label


def pfz_category(score: float | None, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> str:
    return descending_category(score, config.pfz_categories)


def risk_category(score: float | None, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> str:
    return bounded_category(score, config.risk_categories)


def confidence_label(score: float, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> str:
    return descending_category(score, config.confidence_categories, unknown_label="Very Low")
