# MatsyaMitra Deterministic Data Analytics Model

Last updated: 2026-08-01

## Purpose

This document explains the deterministic environmental analytics model implemented in Phase 5.

The model is not a machine learning model and does not predict fish locations. It converts already validated environmental observations into decision-support scores that can later power fishing-zone guidance, marine risk awareness, map layers, and backend APIs.

## Current Boundary

Implemented:

- PFZ suitability scoring
- Marine risk scoring
- Confidence scoring
- Human-readable explanations
- Single-record scoring through `score_record()`
- Batch DataFrame scoring through `score_dataframe()`
- Deterministic tests for scoring behavior
- Storage of generated analytics results through the Phase 6 pipeline

Not implemented in this phase:

- Heatmaps
- REST APIs
- React Native changes
- Scheduling or automation
- INCOIS advisory scraping
- SST front detection
- Ocean current integration
- Machine learning

## Input Contract

The scoring engine consumes validated environmental observations produced by the extraction, quality, and standardization pipeline.

Required input columns:

```text
Latitude
Longitude
Date
SST
WindSpeed
WaveHeight
Chlorophyll
```

Optional input column:

```text
DataAgeHours
```

If `DataAgeHours` is not provided, the engine assumes `0` hours old for scoring confidence.

## Output Contract

The scored output contains the original environmental values plus decision-support fields:

```text
Latitude
Longitude
Date
SST
WindSpeed
WaveHeight
Chlorophyll
PFZScore
PFZCategory
RiskScore
RiskCategory
ConfidenceScore
ConfidenceLabel
Explanation
```

## Implemented Package

```text
analytics/scoring/
  __init__.py
  config.py
  models.py
  normalization.py
  pfz.py
  risk.py
  confidence.py
  categories.py
  explain.py
  engine.py
  tests.py
```

## Public Interface

Use `score_record()` for one observation:

```python
from analytics.scoring import score_record

scored = score_record({
    "Latitude": 13.1,
    "Longitude": 74.8,
    "Date": "2025-06-01T00:00:00",
    "SST": 27.0,
    "WindSpeed": 5.0,
    "WaveHeight": 0.8,
    "Chlorophyll": 1.0,
})

print(scored.to_dict())
```

Use `score_dataframe()` for a Pandas DataFrame:

```python
from analytics.scoring import score_dataframe

scored_dataframe = score_dataframe(validated_dataframe)
```

## Configuration-Driven Design

All scientific thresholds, valid ranges, weights, categories, and freshness factors live in:

```text
analytics/scoring/config.py
```

The scoring logic should not hardcode these constants elsewhere. If the guide or domain expert changes a threshold later, update configuration rather than rewriting scoring modules.

## PFZ Suitability Score

PFZ means Potential Fishing Zone suitability. It is a deterministic environmental suitability score from `0` to `10`.

Current PFZ inputs:

| Parameter | Role |
| --- | --- |
| SST | Sea temperature suitability |
| Chlorophyll | Productivity indicator |
| WindSpeed | Operational access suitability |

Current PFZ weights:

| Parameter | Weight |
| --- | --- |
| SST | 0.40 |
| Chlorophyll | 0.45 |
| WindSpeed | 0.15 |

SST and chlorophyll use trapezoidal suitability functions:

```text
0 outside the useful range
rising suitability between a and b
1 between b and c
falling suitability between c and d
```

Wind suitability is high for lower wind speeds and decreases as wind becomes operationally difficult.

PFZ formula:

```text
PFZScore = weighted suitability index * 10
```

PFZ categories:

| Score Range | Category |
| --- | --- |
| >= 8 | Highly Favourable |
| >= 6 | Favourable |
| >= 4 | Moderate |
| >= 2 | Low |
| < 2 | Very Low |

## Marine Risk Score

Risk score represents marine operating risk from `0` to `10`, where higher means more dangerous.

Current risk inputs:

| Parameter | Role |
| --- | --- |
| WaveHeight | Primary sea-state hazard |
| WindSpeed | Wind hazard |

Current risk weights:

| Parameter | Weight |
| --- | --- |
| WaveHeight | 0.60 |
| WindSpeed | 0.40 |

Wave and wind values are normalized into rising risk indices from `0` to `1`.

Risk formula:

```text
RiskScore = weighted risk index * 10
```

Risk categories:

| Score Range | Category |
| --- | --- |
| 0 to 2 | Safe |
| > 2 to 4 | Low Risk |
| > 4 to 6 | Moderate Risk |
| > 6 to 8 | High Risk |
| > 8 to 10 | Extreme Risk |

## Confidence Score

Confidence measures how complete and fresh the input observation is. It does not mean the PFZ or risk score is scientifically perfect; it means the score was produced from sufficient available data.

Confidence inputs:

| Parameter | Weight |
| --- | --- |
| SST | 0.30 |
| Chlorophyll | 0.35 |
| WindSpeed | 0.20 |
| WaveHeight | 0.15 |

Freshness factors:

| Observation Age | Factor |
| --- | --- |
| <= 6 hours | 1.00 |
| <= 12 hours | 0.95 |
| <= 24 hours | 0.85 |
| <= 48 hours | 0.70 |
| > 48 hours | 0.50 |

Confidence formula:

```text
ConfidenceScore = available parameter weight sum * freshness factor * 100
```

Confidence labels:

| Score Range | Label |
| --- | --- |
| >= 85 | High |
| >= 65 | Moderate |
| >= 40 | Low |
| < 40 | Very Low |

## Missing and Invalid Values

The model is designed to degrade gracefully.

If a PFZ parameter is missing or invalid, the remaining available PFZ weights are redistributed. For example, if chlorophyll is missing, SST and wind can still produce a PFZ score.

If a risk parameter is missing or invalid, the remaining available risk weights are redistributed. For example, if wave height is missing, wind can still produce a risk score.

If all parameters required for a score are missing, the score becomes `None` and its category becomes `Unknown`.

Missing or invalid values always reduce the confidence score.

## Explanation Generation

Every scored record includes a concise explanation string.

The explanation summarizes:

- SST suitability
- Chlorophyll productivity signal
- Wind suitability or risk impact
- Wave-height risk impact
- Missing or invalid parameters
- Reduced confidence due to older observations

These explanations are intentionally short so they can later be shown in a mobile UI or API response.

## Validation Coverage

Current local test command:

```powershell
analytics\.venv\Scripts\python.exe -B -m unittest discover -s analytics\tests -v
```

Current result:

```text
32 tests passed
```

Scoring tests cover:

- Ideal fishing conditions
- Moderate fishing conditions
- Poor fishing conditions
- Dangerous weather
- Missing chlorophyll
- Missing wave height
- Missing wind
- Invalid SST
- Old observations
- Partial observations
- Normalization boundaries
- DataFrame scoring
- Existing environmental record compatibility

## Top-Level Pipeline Position

The scoring model sits after extraction, standardization, quality assurance, and optional persistence ingestion.

```text
Earth Engine Extraction
        |
Unified Environmental DataFrame
        |
Standardization and QA
        |
Validated Environmental DataFrame
        |
Deterministic Scoring Engine
        |
Scored Environmental Output
        |
AnalyticsResults Table
        |
Future: API/Heatmaps/Mobile Visualization
```

## Known Limitations

- Thresholds are deterministic academic assumptions and should be calibrated with domain expert feedback.
- The model does not use INCOIS PFZ advisories yet.
- The model does not detect SST fronts yet.
- The model does not include ocean currents yet.
- The model does not generate heatmaps yet.
- Scores are persisted by the Phase 6 pipeline in `analytics_results`.
- Scores are not yet served through the backend API.
- The React Native app still uses mock PFZ/risk overlays until backend integration is implemented.
