# Open-Meteo Marine & Risk Integration

Last updated: 2026-08-12

## 1. Overview

The Open-Meteo integration extracts hourly wind speed and wave height for the 25 canonical Karnataka sampling locations (`KARN_001`–`KARN_025`) and feeds the standalone Python Risk Analytics engine.

The system uses a two-language, two-step architecture:

* **Step 1 — TypeScript**: HTTP extraction from Open-Meteo $\rightarrow$ `marine_observations` (PostgreSQL)
* **Step 2 — Python**: PostgreSQL read $\rightarrow$ Risk scoring $\rightarrow$ `risk_results` (PostgreSQL)

> [!IMPORTANT]
> PostgreSQL is the **ONLY** communication boundary between TypeScript and Python.

---

## 2. Open-Meteo APIs Used

* **Wind Speed**: Open-Meteo Forecast API
  * **URL**: `https://api.open-meteo.com/v1/forecast`
  * **Parameter**: `wind_speed_10m` (hourly)
  * **Note**: 10m wind speed is the standard reference height for marine surface wind.

* **Wave Height**: Open-Meteo Marine API
  * **URL**: `https://marine-api.open-meteo.com/v1/marine`
  * **Parameter**: `wave_height` (significant wave height, hourly)

---

## 3. TypeScript Extraction Layer

* **Entry point**: [`backend/marine/liveMarineIngestion.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/liveMarineIngestion.ts)
* **Key files**:
  * [`backend/marine/ingest.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/ingest.ts)
  * [`backend/marine/repository.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/repository.ts)
  * [`backend/marine/config.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/config.ts)
  * [`backend/marine/types.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/types.ts)

### Ingestion Flow

1. Load 25 canonical locations from [`sampling_points.geojson`](file:///e:/Major%20Project/MatsyaMitra/analytics/data/geometry/sampling_points.geojson).
2. Fetch hourly `wind_speed_10m` from Open-Meteo Forecast API for all 25 locations.
3. Fetch hourly `wave_height` from Open-Meteo Marine API for all 25 locations.
4. Match API responses to canonical `location_id` (`KARN_001`–`KARN_025`).
5. Store source grid coordinates (`source_latitude`, `source_longitude`) separately from canonical coordinates.
6. Insert observations into `marine_observations` with configurable duplicate policy.
7. Print ingestion summary (inserted/skipped/updated/replaced).

### Environment Variables

| Variable | Requirement | Default | Description |
| :--- | :--- | :--- | :--- |
| `MATSYAMITRA_DATABASE_URL` | **Required** | — | PostgreSQL connection string |
| `MATSYAMITRA_DUPLICATE_POLICY` | Optional | `skip` | Ingestion duplicate policy (`skip`, `update`, `replace`) |
| `MATSYAMITRA_SAMPLING_POINTS_PATH` | Optional | `analytics/data/geometry/sampling_points.geojson` | Path to canonical sampling points GeoJSON |

### Run Command

```powershell
npx tsx backend/marine/liveMarineIngestion.ts
```

---

## 4. `marine_observations` Table

### Key Columns

* `marine_observation_id` (PK)
* `sampling_location_id` (FK to `sampling_locations`, nullable, backfilled)
* `location_id` (`KARN_xxx` string)
* `latitude` (canonical WGS84)
* `longitude` (canonical WGS84)
* `observation_timestamp` (tz-aware datetime)
* `wind_speed` ($m/s$)
* `wave_height` ($m$)
* `source` (`'open-meteo'`)
* `source_latitude` (Open-Meteo grid-cell)
* `source_longitude` (Open-Meteo grid-cell)
* `source_metadata` (JSON)
* `created_at`

### Unique Constraint

```sql
UNIQUE (location_id, observation_timestamp, source)
```

> [!NOTE]
> Canonical latitude/longitude are preserved even when Open-Meteo returns different grid-cell coordinates.

---

## 5. Python Risk Pipeline Layer

* **Coordinator**: [`analytics/live_open_meteo_pipeline.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/live_open_meteo_pipeline.py)
* **Key files**:
  * [`analytics/persistence/marine_repository.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/persistence/marine_repository.py) (`MarineObservationRepository`: backfill + latest obs query)
  * [`analytics/persistence/repository.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/persistence/repository.py) (`RiskRepository`)
  * [`analytics/scoring/risk_engine.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/risk_engine.py) ([`score_risk_record`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/risk_engine.py))
  * [`analytics/scoring/models.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/models.py) ([`RiskScoringInput`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/models.py), [`RiskScoredResult`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/models.py))

### Pipeline Flow

1. Invoke TypeScript ingestion via subprocess (`npx tsx backend/marine/liveMarineIngestion.ts`).
2. Backfill `sampling_location_id` for any `marine_observations` missing it (`MarineObservationRepository`).
3. Fetch latest marine observation per canonical location.
4. Calculate `data_age_hours = current UTC time - observation_timestamp` (REAL value, not default).
5. Build [`RiskScoringInput`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/models.py) (`wind_speed`, `wave_height`, `data_age_hours`, `source='open-meteo'`).
6. Score via [`score_risk_record()`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/risk_engine.py) — Python is the sole authoritative Risk engine.
7. Insert into `risk_results` via `RiskRepository` (duplicate skip policy).
8. Print PostgreSQL verification report.

### Run Command

```powershell
$env:MATSYAMITRA_DATABASE_URL='postgresql+psycopg2://postgres:admin@localhost:5432/matsyamitra'
$env:PYTHONPATH='e:\Major Project\MatsyaMitra'
analytics\.venv\Scripts\python.exe analytics\live_open_meteo_pipeline.py
```

---

## 6. Risk Scoring (summary)

* **Inputs**: Wind Speed + Wave Height **ONLY**
* **NOT used**: SST, Chlorophyll, PFZ score (these do not appear on [`RiskScoringInput`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/models.py))
* **Weights (normalized)**: Wind = 0.5714, Wave = 0.4286
* **Formula**: $\text{RiskScore} = \text{weighted\_risk\_index} \times 10$ ($0$ to $10$)
* **`source` field**: metadata only — does not affect numeric score (enables future INCOIS replacement)
* **Categories**: `Safe` / `Low Risk` / `Moderate Risk` / `High Risk` / `Extreme Risk`
* **Confidence**: reduced by missing parameters and data age

---

## 7. Coordinate Handling

* Canonical coordinates (from [`sampling_points.geojson`](file:///e:/Major%20Project/MatsyaMitra/analytics/data/geometry/sampling_points.geojson)) are the authoritative Map/API coordinates.
* Open-Meteo may adjust requested coordinates to nearest grid cell centre.
* Both are stored: canonical in `location_id`/`latitude`/`longitude`, source grid in `source_latitude`/`source_longitude`.
* Canonical coordinates are **NEVER** overwritten.

---

## 8. Legacy Risk Removal (Module 5)

Prior to Module 5, [`backend/marine/ingest.ts`](file:///e:/Major%20Project/MatsyaMitra/backend/marine/ingest.ts) contained TypeScript risk scoring logic.

This was **REMOVED** in Module 5. `marine_observations` now stores **ONLY** raw observations.

Python ([`analytics/scoring/risk_engine.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/scoring/risk_engine.py)) is the sole authoritative Risk analytics engine. This ensures Risk scoring is deterministic, testable, and version-controlled in one place.

---

## 9. Operational Frequency

* **INTENDED**: hourly (`observation_timestamp` changes every hour)
* **CURRENT STATUS**: Manual — no automated scheduler implemented yet
* Each hourly run produces new `risk_results` rows for that hour
* Previous hourly records are preserved (not overwritten)
* Module 7 will implement the hourly scheduler

---

## 10. Testing

* **Integration tests**: [`analytics/tests/test_open_meteo_integration.py`](file:///e:/Major%20Project/MatsyaMitra/analytics/tests/test_open_meteo_integration.py)
* **Tests cover**: canonical mapping, hourly coexistence, freshness calculation, risk source independence
* **Full Python suite**: 118 tests passing
* **TypeScript compilation**: `npx tsc --noEmit` (no errors)

---

## 11. Live Verification (2026-08-10)

* 25 canonical locations extracted
* 25 `marine_observations` rows (wind + wave)
* 25 `risk_results` rows scored and persisted
* **Risk score range**: 4.56 – 6.75
* **Risk categories**: Moderate Risk / High Risk
* **Source**: `open-meteo`
* **`data_age_hours`**: calculated from actual `observation_timestamp`

---

## 12. Limitations

* No automated scheduler yet (Module 7)
* Open-Meteo grid-cell coordinate shift documented but harmless (both stored)
* Non-commercial API rate limits apply
* INCOIS as alternative source: planned but not implemented
* `data_age_hours` defaults to 0.0 in unit tests; live pipeline uses real timestamps
