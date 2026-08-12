# MatsyaMitra Database Integration Pipeline
**Last updated: 2026-08-12**

## SECTION 1: Purpose and Overview

After Modules 1–6, MatsyaMitra has **TWO independent data pipelines** that share the canonical `sampling_locations` table and communicate exclusively via PostgreSQL.

### High-level flow

```text
  CANONICAL LOCATIONS
  (sampling_locations table)
         |
    _____|_____
   |           |
   v           v
  GEE      Open-Meteo
  (Python)  (TypeScript)
   |           |
  SST+Chl   Wind+Wave
   |           |
   v           v
  environ-  marine_
  mental_   observations
  observ-        |
  ations         v
   |         Risk Engine
   v         (Python)
  PFZ Engine      |
  (Python)        v
   |          risk_results
   v                |
  pfz_results       |
        \           /
         \         /
          v       v
   Current State Aggregator
   (current_state.py)
          |
          v
   CurrentLocationEnvironmentalState
          |
          v
   Future API / Maps
```

## SECTION 2: Database Tables

### 2a. sampling_locations
- **Purpose**: Authoritative canonical location registry
- **Key fields**: `id` (PK), `location_id` (KARN_001–KARN_025), `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`
- **Used by**: ALL pipelines. The source of truth for location identity.
- **Note**: 25 rows in production, seeded from `sampling_points.geojson`.

### 2b. environmental_observations
- **Purpose**: Store validated GEE environmental parameter observations
- **Key fields**: `observation_id` (PK), `sampling_location_id` (FK nullable — old random GEE samples have NULL), `latitude`, `longitude`, `observation_date`, `sst`, `wind_speed` (GEE reference only), `wave_height` (GEE reference only), `chlorophyll`, `created_at`, `updated_at`, `run_id` (FK to `extraction_runs`)
- **Unique constraint**: `latitude` + `longitude` + `observation_date`
- **Note**: `sampling_location_id` was backfilled by Module 1 Alembic migration.
- **IMPORTANT**: `wind_speed` and `wave_height` in this table come from GEE and are NOT used for operational Risk scoring. They are for reference/validation only.

### 2c. marine_observations
- **Purpose**: Store Open-Meteo hourly marine observations
- **Key fields**: `marine_observation_id` (PK), `sampling_location_id` (FK nullable, backfilled), `location_id` (string KARN_xxx), `latitude`, `longitude`, `observation_timestamp` (tz-aware), `wind_speed`, `wave_height`, `source` ('open-meteo'), `source_latitude`, `source_longitude`, `source_metadata` (JSON), `created_at`
- **Unique constraint**: `location_id` + `observation_timestamp` + `source`
- **Note**: `source_latitude` / `source_longitude` capture the Open-Meteo grid-cell coordinates which may differ from canonical coordinates.

### 2d. pfz_results
- **Purpose**: Standalone PFZ analytics outputs (Module 2+)
- **Key fields**: `id` (PK), `sampling_location_id` (FK), `observation_date`, `environmental_observation_id` (FK nullable), `source` ('gee'), `sst`, `chlorophyll`, `pfz_score`, `pfz_category`, `confidence_score`, `analytics_version`, `created_at`
- **Unique constraint**: `sampling_location_id` + `observation_date` + `analytics_version`
- **Note**: Wind is NOT stored here. PFZ uses SST + Chlorophyll only.

### 2e. risk_results
- **Purpose**: Standalone Risk analytics outputs (Module 3+)
- **Key fields**: `id` (PK), `sampling_location_id` (FK), `observation_timestamp` (tz-aware), `marine_observation_id` (FK nullable), `source` ('open-meteo'), `wind_speed`, `wave_height`, `risk_score`, `risk_category`, `confidence_score`, `analytics_version`, `created_at`
- **Unique constraint**: `sampling_location_id` + `observation_timestamp` + `analytics_version`
- **Note**: Multiple hourly records per location accumulate over time.

### 2f. analytics_results (LEGACY)
- **Purpose**: Old unified scoring results (pre-Module 2 architecture)
- **Key fields**: `analytics_id` (PK), `observation_id` (FK), `pfz_score`, `pfz_category`, `risk_score`, `risk_category`, `confidence_score`, `confidence_label`, `explanation`, `analytics_version`, `created_at`
- **Status**: RETAINED FOR BACKWARD COMPATIBILITY. Not the primary result table for current operations.

### 2g. extraction_runs
- **Purpose**: Track GEE pipeline execution metadata
- **Key fields**: `run_id` (UUID PK), `execution_timestamp`, `requested_start_date`, `requested_end_date`, `sample_count`, `retained_count`, `missing_summary`, `execution_time`, `status`, `warnings`

### 2h. dataset_metadata
- **Purpose**: Reference table for environmental parameters and their GEE datasets
- **Key fields**: `parameter` (PK), `dataset`, `unit`, `resolution`, `description`, `last_verified`

### 2i. alembic_version
- **Purpose**: Tracks applied Alembic schema migrations
- **Current migration**: `001_add_sampling_locations_pfz_risk`

## SECTION 3: GEE Pipeline Flow

**Script**: `live_gee_pipeline.py`

1. Load 25 canonical locations from `sampling_points.geojson`.
2. Initialize Earth Engine.
3. Determine analysis date window (dynamic or `MATSYAMITRA_ANALYSIS_DATE` override).
4. Query GEE: NOAA OISST for SST (sorted by `system:time_start` DESC).
5. Query GEE: Copernicus Chlorophyll (sorted by `system:time_start` DESC — independent timestamp).
6. Sample at 25 canonical locations.
7. Standardize and QA.
8. Insert into `environmental_observations`.
9. Score with `pfz_engine.score_pfz_record()` for each location.
10. Insert into `pfz_results` via `PfzRepository`.

## SECTION 4: Open-Meteo Pipeline Flow

### Step 1 — TypeScript (`backend/marine/liveMarineIngestion.ts`)
1. Load 25 canonical locations from `sampling_points.geojson`.
2. Fetch wind_speed from Open-Meteo Forecast API for all 25 locations.
3. Fetch wave_height from Open-Meteo Marine API for all 25 locations.
4. Insert into `marine_observations` with duplicate skip policy.
5. Returns: inserted/skipped counts.

### Step 2 — Python (`analytics/live_open_meteo_pipeline.py`)
1. Invoke TypeScript ingestion via subprocess.
2. Backfill `sampling_location_id` via `MarineObservationRepository`.
3. Fetch latest marine observations per canonical location.
4. Calculate real `data_age_hours` = current UTC - `observation_timestamp`.
5. Build `RiskScoringInput` for each location.
6. Score via `score_risk_record()`.
7. Insert into `risk_results` via `RiskRepository`.
8. Print verification report.

> [!NOTE]  
> PostgreSQL is the ONLY communication boundary between TypeScript and Python.

## SECTION 5: Current-State Aggregation Flow

**Script**: `analytics/current_state.py` (READ-ONLY)

1. Load all active `sampling_locations` (25).
2. `PfzRepository.get_latest_pfz_results()` — fetches one record per location via `ROW_NUMBER()`.
3. `RiskRepository.get_latest_risk_results()` — fetches one record per location via `ROW_NUMBER()`.
4. Join in application code via `sampling_location_id`.
5. Calculate independent ages (PFZ from midnight UTC of `observation_date`; Risk from exact `observation_timestamp`).
6. Apply `FreshnessConfig` thresholds — CURRENT / STALE / MISSING metadata only.
7. Return list[`CurrentLocationEnvironmentalState`].

> [!IMPORTANT]  
> This aggregation involves No INSERTs, no UPDATEs, and no DELETEs. It operates purely as a read-only aggregation.

## SECTION 6: Foreign Key Relationships

- `sampling_locations.id` → referenced by:
  - `environmental_observations.sampling_location_id` (nullable)
  - `marine_observations.sampling_location_id` (nullable, backfilled)
  - `pfz_results.sampling_location_id`
  - `risk_results.sampling_location_id`
- `environmental_observations.observation_id` → referenced by:
  - `analytics_results.observation_id` (legacy)
  - `pfz_results.environmental_observation_id` (nullable)
- `marine_observations.marine_observation_id` → referenced by:
  - `risk_results.marine_observation_id` (nullable)
- `extraction_runs.run_id` → referenced by:
  - `environmental_observations.run_id`

## SECTION 7: Duplicate Policies

- **environmental_observations**: skip (default), replace, update (via `MATSYAMITRA_DUPLICATE_POLICY`)
- **pfz_results**: skip (repository checks before insert)
- **risk_results**: skip (repository checks before insert)
- **marine_observations**: skip (default, via TypeScript `MATSYAMITRA_DUPLICATE_POLICY`)

## SECTION 8: Analytics Versioning

- All result tables store `analytics_version` (default: `'deterministic-v1'`).
- Configured via environment variable `MATSYAMITRA_ANALYTICS_VERSION`.

## SECTION 9: Production Database

- PostgreSQL is the ONLY production/runtime database.
- SQLite is used ONLY for fast isolated unit testing. Do NOT use SQLite in live pipelines.
- Connection URL managed via: `MATSYAMITRA_DATABASE_URL` (e.g., `postgresql+psycopg2://...`).

## SECTION 10: Environment Variables

Complete list of environment variables:
- `MATSYAMITRA_DATABASE_URL` (required)
- `MATSYAMITRA_DATABASE_ECHO`
- `MATSYAMITRA_DATABASE_POOL_PRE_PING`
- `MATSYAMITRA_DATABASE_SCHEMA_VERSION`
- `MATSYAMITRA_OBSERVATIONS_TABLE`
- `MATSYAMITRA_RUNS_TABLE`
- `MATSYAMITRA_METADATA_TABLE`
- `MATSYAMITRA_ANALYTICS_RESULTS_TABLE`
- `MATSYAMITRA_MARINE_OBSERVATIONS_TABLE`
- `MATSYAMITRA_SAMPLING_LOCATIONS_TABLE`
- `MATSYAMITRA_PFZ_RESULTS_TABLE`
- `MATSYAMITRA_RISK_RESULTS_TABLE`
- `MATSYAMITRA_DUPLICATE_POLICY`
- `MATSYAMITRA_ANALYTICS_VERSION`
- `MATSYAMITRA_ANALYSIS_DATE` (optional; defaults to current date if not set)
- `MATSYAMITRA_ANALYSIS_WINDOW_DAYS`
- `MATSYAMITRA_GEE_PROJECT`
- `MATSYAMITRA_PFZ_STALE_HOURS` (default: 96)
- `MATSYAMITRA_RISK_STALE_HOURS` (default: 2)

## SECTION 11: Current Limitations

*(Same as `SYSTEM_ARCHITECTURE.md` limitations section.)*
- Pipeline steps and components may have system-specific limitations based on the available data windows or network boundaries.
- External dependencies such as Earth Engine and Open-Meteo APIs are subject to their own rate limits and latency.
- Currently decoupled architectural limits restrict inter-process sharing except via the database.
