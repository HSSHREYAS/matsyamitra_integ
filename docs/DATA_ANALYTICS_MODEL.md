# MatsyaMitra Analytics Model
*Last updated: 2026-08-12*

## SECTION 1: Overview
The analytics model is deterministic and rule-based (not ML). After Module 1–6, PFZ and Risk are COMPLETELY SEPARATED into independent scoring engines with independent persistence.

## SECTION 2: Architecture Separation (CRITICAL)
- **OLD (legacy)**: unified engine accepted SST, Chlorophyll, Wind, Wave → produced combined PFZ+Risk in `analytics_results`
- **CURRENT**: two separate standalone engines:
  - **PFZ engine**: SST + Chlorophyll ONLY → `pfz_results`
  - **Risk engine**: Wind + Wave ONLY → `risk_results`

**Why separated:** different temporal resolutions (GEE daily, Open-Meteo hourly); different data sources; independence allows each to be updated without affecting the other.

## SECTION 3: PFZ Analytics Engine
**File:** `analytics/scoring/pfz_engine.py`

### Input model: `PfzScoringInput`
- `sampling_location_id`: int
- `observation_date`: date
- `sst`: Optional[float]
- `chlorophyll`: Optional[float]
- `data_age_hours`: float (default 0.0)
- `source`: str (default 'gee')
- `analytics_version`: str

*(NO wind, NO wave — they do not exist on this input)*

### Output model: `PfzScoredResult`
- All input fields preserved
- `pfz_score`: Optional[float] (0–10)
- `pfz_category`: str
- `confidence_score`: float

### PFZ Inputs (CURRENT, post Module 2):
- **SST** — trapezoidal suitability (thresholds preserved from original model)
- **Chlorophyll** — trapezoidal suitability (thresholds preserved from original model)
- **Wind** — REMOVED from PFZ (as of Module 2)

### Normalized weights (post Module 2, renormalized from original SST=0.40, Chl=0.45 after Wind removal):
- SST: 0.4706
- Chlorophyll: 0.5294

**Formula:** `PFZScore = weighted_suitability_index * 10`

### Missing-value handling:
- If SST missing: weight redistributed to Chlorophyll (full weight 1.0)
- If Chlorophyll missing: weight redistributed to SST (full weight 1.0)
- If both missing: `pfz_score = None`, `pfz_category = 'Unknown'`
- Missing values always reduce confidence

### PFZ categories:
- `>= 8`: Highly Favourable
- `>= 6`: Favourable
- `>= 4`: Moderate
- `>= 2`: Low
- `< 2`: Very Low
- `None`: Unknown

### PFZ Confidence:
- Normalized weights: SST=0.4615, Chlorophyll=0.5385
- Multiplied by freshness factor based on `data_age_hours`
- Freshness factors (same as legacy model):
  - `<= 6h`: 1.00
  - `<= 12h`: 0.95
  - `<= 24h`: 0.85
  - `<= 48h`: 0.70
  - `> 48h`: 0.50
- *Note:* for GEE data, `data_age_hours` is calculated from `observation_date` (conservative floor — see limitations)

**Function:** `score_pfz_record(input: PfzScoringInput) -> PfzScoredResult`

## SECTION 4: Risk Analytics Engine
**File:** `analytics/scoring/risk_engine.py`

### Input model: `RiskScoringInput`
- `sampling_location_id`: int
- `observation_timestamp`: datetime (timezone-aware)
- `wind_speed`: Optional[float]
- `wave_height`: Optional[float]
- `data_age_hours`: float (default 0.0; live pipeline provides actual value)
- `source`: str (default 'open-meteo'; future INCOIS will use 'incois')
- `analytics_version`: str

*(NO SST, NO chlorophyll, NO PFZ score — they do not exist on this input)*

### Output model: `RiskScoredResult`
- All input fields preserved
- `risk_score`: Optional[float] (0–10)
- `risk_category`: str
- `confidence_score`: float

### Risk Inputs (CURRENT, post Module 3):
- **Wind Speed** (from Open-Meteo Forecast API)
- **Wave Height** (from Open-Meteo Marine API)
- **SST** — REMOVED from Risk (as of Module 3)
- **Chlorophyll** — REMOVED from Risk (as of Module 3)
- **PFZ score** — NEVER used in Risk

### Normalized operational weights:
Original weights before normalization: Wind=0.40, Wave=0.60 (but Wave weight convention may differ in impl).
- Wind: 0.5714 (normalized from original relative weights)
- Wave: 0.4286 (normalized from original relative weights)

**Formula:** `RiskScore = weighted_risk_index * 10`

Wave and Wind values are normalized into rising risk indices (0 to 1).

### Missing-value handling:
- If Wind missing: weight redistributed to Wave
- If Wave missing: weight redistributed to Wind
- If both missing: `risk_score = None`, `risk_category = 'Unknown'`

### Risk categories:
- `0–2`: Safe
- `>2–4`: Low Risk
- `>4–6`: Moderate Risk
- `>6–8`: High Risk
- `>8–10`: Extreme Risk

### Risk Confidence:
- Normalized weights: Wind=0.5714, Wave=0.4286
- Multiplied by freshness factor based on `data_age_hours`
- Same freshness factor table as PFZ
- *Note:* live pipeline calculates real `data_age_hours` from actual Open-Meteo observation timestamp

### Source abstraction:
`source` field is metadata only. Same Wind+Wave values with `source='open-meteo'` or `source='incois'` produce IDENTICAL Risk scores. This allows future INCOIS replacement without changing the scoring contract.

**Function:** `score_risk_record(input: RiskScoringInput) -> RiskScoredResult`

## SECTION 5: Result Tables

### PFZ results: `pfz_results` table
- **Unique key**: `sampling_location_id` + `observation_date` + `analytics_version`
- Multiple results per location over time are preserved
- Latest retrieved via `ROW_NUMBER()` window function

### Risk results: `risk_results` table
- **Unique key**: `sampling_location_id` + `observation_timestamp` + `analytics_version`
- Multiple hourly results per location are preserved
- Latest retrieved via `ROW_NUMBER()` window function

### LEGACY: `analytics_results` table
- Used by the old unified scoring pipeline
- Retained for backward compatibility and regression testing
- NOT the primary result table for PFZ or Risk in the current architecture

## SECTION 6: Legacy Scoring Engine
**Files:** `analytics/scoring/engine.py`, `analytics/scoring/pfz.py`, `analytics/scoring/risk.py`
The original unified engine (`score_record()`, `score_dataframe()`) still exists for backward compatibility.
It accepts all four parameters (SST, Chlorophyll, Wind, Wave) and stores results in `analytics_results`.
Do not use it for new operational PFZ or Risk production.

## SECTION 7: Testing
- **Current test suite:** 118 tests passing
- **PFZ-specific tests:** `test_pfz_scoring.py`, `test_pfz_repository.py`
- **Risk-specific tests:** `test_risk_scoring.py`, `test_risk_repository.py`
- **Legacy engine tests:** `analytics/scoring/tests.py` (still pass)

## SECTION 8: Known Limitations
- PFZ thresholds are deterministic and should be calibrated with domain expert feedback
- PFZ source timestamp not captured (`observation_date` only) — age is conservative floor
- Risk thresholds should be calibrated with maritime domain experts
- INCOIS advisories not integrated
- No SST front detection
- No ocean current integration
- No heatmap generation
- Not yet served through REST API
