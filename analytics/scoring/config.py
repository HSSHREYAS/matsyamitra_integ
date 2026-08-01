from dataclasses import dataclass


@dataclass(frozen=True)
class TrapezoidSuitability:
    valid_min: float
    valid_max: float
    a: float
    b: float
    c: float
    d: float


@dataclass(frozen=True)
class WindSuitability:
    valid_min: float
    valid_max: float
    full_suitability_max: float
    zero_suitability_at: float


@dataclass(frozen=True)
class RiskRamp:
    valid_min: float
    valid_max: float
    safe_max: float
    moderate_at: float
    extreme_at: float


@dataclass(frozen=True)
class ScoreCategory:
    label: str
    min_value: float | None = None
    max_value: float | None = None


@dataclass(frozen=True)
class FreshnessThreshold:
    max_age_hours: float | None
    factor: float


@dataclass(frozen=True)
class ScoringConfig:
    sst: TrapezoidSuitability
    chlorophyll: TrapezoidSuitability
    wind_pfz: WindSuitability
    wind_risk: RiskRamp
    wave_risk: RiskRamp
    pfz_weights: dict[str, float]
    risk_weights: dict[str, float]
    confidence_weights: dict[str, float]
    pfz_categories: tuple[ScoreCategory, ...]
    risk_categories: tuple[ScoreCategory, ...]
    confidence_categories: tuple[ScoreCategory, ...]
    freshness_thresholds: tuple[FreshnessThreshold, ...]


DEFAULT_SCORING_CONFIG = ScoringConfig(
    sst=TrapezoidSuitability(
        valid_min=15.0,
        valid_max=35.0,
        a=24.0,
        b=26.0,
        c=29.0,
        d=31.0,
    ),
    chlorophyll=TrapezoidSuitability(
        valid_min=0.01,
        valid_max=20.0,
        a=0.1,
        b=0.3,
        c=2.0,
        d=4.0,
    ),
    wind_pfz=WindSuitability(
        valid_min=0.0,
        valid_max=60.0,
        full_suitability_max=8.0,
        zero_suitability_at=15.0,
    ),
    wind_risk=RiskRamp(
        valid_min=0.0,
        valid_max=60.0,
        safe_max=7.0,
        moderate_at=11.0,
        extreme_at=17.0,
    ),
    wave_risk=RiskRamp(
        valid_min=0.0,
        valid_max=15.0,
        safe_max=0.5,
        moderate_at=1.5,
        extreme_at=2.5,
    ),
    pfz_weights={
        "sst": 0.40,
        "chlorophyll": 0.45,
        "wind": 0.15,
    },
    risk_weights={
        "wave": 0.60,
        "wind": 0.40,
    },
    confidence_weights={
        "sst": 0.30,
        "chlorophyll": 0.35,
        "wind": 0.20,
        "wave": 0.15,
    },
    pfz_categories=(
        ScoreCategory(label="Highly Favourable", min_value=8.0),
        ScoreCategory(label="Favourable", min_value=6.0),
        ScoreCategory(label="Moderate", min_value=4.0),
        ScoreCategory(label="Low", min_value=2.0),
        ScoreCategory(label="Very Low", min_value=0.0),
    ),
    risk_categories=(
        ScoreCategory(label="Safe", min_value=0.0, max_value=2.0),
        ScoreCategory(label="Low Risk", min_value=2.0, max_value=4.0),
        ScoreCategory(label="Moderate Risk", min_value=4.0, max_value=6.0),
        ScoreCategory(label="High Risk", min_value=6.0, max_value=8.0),
        ScoreCategory(label="Extreme Risk", min_value=8.0, max_value=10.0),
    ),
    confidence_categories=(
        ScoreCategory(label="High", min_value=85.0),
        ScoreCategory(label="Moderate", min_value=65.0),
        ScoreCategory(label="Low", min_value=40.0),
        ScoreCategory(label="Very Low", min_value=0.0),
    ),
    freshness_thresholds=(
        FreshnessThreshold(max_age_hours=6.0, factor=1.00),
        FreshnessThreshold(max_age_hours=12.0, factor=0.95),
        FreshnessThreshold(max_age_hours=24.0, factor=0.85),
        FreshnessThreshold(max_age_hours=48.0, factor=0.70),
        FreshnessThreshold(max_age_hours=None, factor=0.50),
    ),
)
