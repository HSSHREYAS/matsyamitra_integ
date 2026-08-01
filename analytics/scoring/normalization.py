from math import isnan
from typing import Any

from .config import RiskRamp, TrapezoidSuitability, WindSuitability


def to_valid_float(value: Any, valid_min: float, valid_max: float) -> float | None:
    if value is None:
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if isnan(numeric) or numeric < valid_min or numeric > valid_max:
        return None

    return numeric


def clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def trapezoid_suitability(value: Any, config: TrapezoidSuitability) -> float | None:
    numeric = to_valid_float(value, config.valid_min, config.valid_max)
    if numeric is None:
        return None

    if numeric < config.a:
        return 0.0
    if config.a <= numeric < config.b:
        return clamp_unit((numeric - config.a) / (config.b - config.a))
    if config.b <= numeric <= config.c:
        return 1.0
    if config.c < numeric <= config.d:
        return clamp_unit((config.d - numeric) / (config.d - config.c))
    return 0.0


def wind_pfz_suitability(value: Any, config: WindSuitability) -> float | None:
    numeric = to_valid_float(value, config.valid_min, config.valid_max)
    if numeric is None:
        return None

    if numeric <= config.full_suitability_max:
        return 1.0
    if numeric <= config.zero_suitability_at:
        return clamp_unit(
            (config.zero_suitability_at - numeric)
            / (config.zero_suitability_at - config.full_suitability_max)
        )
    return 0.0


def rising_risk_index(value: Any, config: RiskRamp) -> float | None:
    numeric = to_valid_float(value, config.valid_min, config.valid_max)
    if numeric is None:
        return None

    if numeric <= config.safe_max:
        return 0.0
    if numeric <= config.moderate_at:
        return clamp_unit((numeric - config.safe_max) / (config.moderate_at - config.safe_max) * 0.5)
    if numeric <= config.extreme_at:
        return clamp_unit(
            0.5 + ((numeric - config.moderate_at) / (config.extreme_at - config.moderate_at) * 0.5)
        )
    return 1.0


def weighted_score_with_redistribution(
    values: dict[str, float | None],
    weights: dict[str, float],
) -> tuple[float | None, dict[str, float]]:
    available = {key: value for key, value in values.items() if value is not None}
    if not available:
        return None, {}

    total_weight = sum(weights[key] for key in available)
    adjusted_weights = {
        key: weights[key] / total_weight
        for key in available
    }
    raw = sum(adjusted_weights[key] * value for key, value in available.items())

    return round(raw * 10.0, 2), adjusted_weights
