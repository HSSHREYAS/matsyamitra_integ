from .models import ConfidenceResult, ScoringInput, WeightedScore


def build_explanation(
    record: ScoringInput,
    pfz: WeightedScore,
    risk: WeightedScore,
    confidence: ConfidenceResult,
) -> str:
    parts: list[str] = []

    parts.append(_describe_sst(record.sst, pfz.normalized_values.get("sst")))
    parts.append(_describe_chlorophyll(record.chlorophyll, pfz.normalized_values.get("chlorophyll")))
    parts.append(_describe_wind(record.wind_speed, pfz.normalized_values.get("wind"), risk.normalized_values.get("wind")))
    parts.append(_describe_wave(record.wave_height, risk.normalized_values.get("wave")))

    missing = [
        label
        for key, label in {
            "sst": "SST",
            "chlorophyll": "Chlorophyll",
            "wind": "Wind",
            "wave": "Wave height",
        }.items()
        if not confidence.availability[key]
    ]
    if missing:
        parts.append(f"Missing or invalid {', '.join(missing)} reduces confidence.")

    if confidence.freshness_factor < 1.0:
        parts.append("Older observation window reduces confidence.")

    return " ".join(part for part in parts if part)


def _describe_sst(value: float | None, suitability: float | None) -> str:
    if suitability is None:
        return "SST unavailable or invalid."
    if suitability >= 0.9:
        return "SST is in the optimal range."
    if suitability >= 0.4:
        return "SST is marginally suitable."
    return "SST is outside the preferred fishing range."


def _describe_chlorophyll(value: float | None, suitability: float | None) -> str:
    if suitability is None:
        return "Chlorophyll unavailable or invalid."
    if suitability >= 0.9:
        return "Chlorophyll indicates productive waters."
    if suitability >= 0.4:
        return "Chlorophyll is moderately favourable."
    return "Chlorophyll is low or bloom-like for fishing suitability."


def _describe_wind(
    value: float | None,
    pfz_suitability: float | None,
    risk_index: float | None,
) -> str:
    if pfz_suitability is None or risk_index is None:
        return "Wind unavailable or invalid."
    if risk_index >= 0.75:
        return "Wind creates high marine risk."
    if pfz_suitability >= 0.9:
        return "Wind is favourable for fishing access."
    if pfz_suitability >= 0.4:
        return "Wind is moderate and slightly reduces fishing suitability."
    return "Strong wind reduces fishing suitability."


def _describe_wave(value: float | None, risk_index: float | None) -> str:
    if risk_index is None:
        return "Wave height unavailable or invalid."
    if risk_index >= 0.75:
        return "Wave height indicates dangerous sea state."
    if risk_index >= 0.4:
        return "Wave height indicates moderate caution."
    return "Wave height is low."
