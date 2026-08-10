# MatsyaMitra Data Extraction Framework

Last updated: 2026-08-10

## Purpose

This document explains the complete Earth observation data framework currently implemented in MatsyaMitra.

The framework is not a fish prediction model. It is a reusable environmental data pipeline that extracts, aligns, validates, standardizes, cleans, stores, and scores coastal ocean parameters so they can later support PFZ/risk map layers and backend APIs.

## Completed Phases

- Phase 1: reusable Earth Engine extraction framework
- Phase 2: multi-dataset environmental integration
- Phase 3: data standardization and quality assurance
- Phase 4: SQLAlchemy persistence layer for validated observations
- Phase 5: deterministic PFZ, risk, confidence, and explanation scoring
- Phase 6: end-to-end persistence pipeline connecting extraction, QA, observation storage, scoring, and analytics-result storage

Live PostgreSQL deployment, REST API integration, heatmap generation, machine learning, scheduling, and React Native UI integration are not implemented in this framework yet.

## Input Foundation

The framework assumes the Earth Engine setup already exists:

- Earth Engine Community tier configured
- Google Cloud Project linked
- Python Earth Engine API installed
- Earth Engine authentication completed
- Earth Engine initialization verified

The canonical Area of Interest is:

```text
analytics/data/geometry/karnataka_aoi.geojson
```

All extraction scripts must load this GeoJSON. Coordinates must not be hardcoded in source code.

Canonical sampling points are stored at:

```text
analytics/data/geometry/sampling_points.geojson
```

These 25 stable `KARN_001` to `KARN_025` points are reused by GEE extraction, Open-Meteo ingestion, and future map visualization.

## Implemented Files

```text
analytics/
  config.py
  geometry.py
  datasets.py
  adapters.py
  extractor.py
  sampler.py
  temporal.py
  pipeline.py
  validation.py
  schemas.py
  metadata.py
  standardizer.py
  quality.py
  cleaner.py
  report.py
  persistence/
    database.py
    models.py
    repository.py
    session.py
    ingest.py
    queries.py
    exceptions.py
  scoring/
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
  end_to_end_pipeline.py
  tests/
    test_quality_pipeline.py
    test_persistence.py
    test_scoring_engine.py
  data/
    geometry/
      karnataka_aoi.geojson
      sampling_points.geojson
```

## Phase 1: Generic Extraction

Phase 1 created the reusable Earth Engine framework. NOAA OISST was used only to validate that the framework works.

Core modules:

- `config.py`: stores project ID, AOI path, date window, sampling config, dataset config, parameter metadata, and cleaning policies.
- `geometry.py`: loads `karnataka_aoi.geojson` and converts it into an Earth Engine geometry.
- `datasets.py`: central registry of Earth Engine datasets.
- `extractor.py`: filters ImageCollections by AOI and date, clips images, and normalizes output to a generic `value` band.
- `sampler.py`: samples raster values into Pandas DataFrames.
- `validation.py`: validates framework execution.

Important decision:

The extractor does not know about NOAA, ERA5, or Copernicus. Provider-specific behavior is kept outside the extractor.

## Phase 2: Multi-Dataset Integration

Phase 2 proved that the framework is generic by supporting all selected environmental parameters.

| Output Column | Source | Earth Engine Dataset | Band or Calculation |
| --- | --- | --- | --- |
| `SST` | NOAA OISST v2.1 | `NOAA/CDR/OISST/V2_1` | `sst` with scale `0.01` |
| `WindSpeed` | ERA5 Hourly | `ECMWF/ERA5/HOURLY` | `sqrt(u10^2 + v10^2)` |
| `WaveHeight` | ERA5 Hourly | `ECMWF/ERA5/HOURLY` | `significant_height_of_combined_wind_waves_and_swell` |
| `Chlorophyll` | Copernicus Ocean Colour | `COPERNICUS/MARINE/OC_GLO_BGC/PLANKTON_MULTI_4KM` | `CHL` |

## Dataset Adapters

Dataset-specific logic is isolated in `adapters.py`.

Current adapters:

- `SingleBandAdapter`: selects one configured band and renames it to `value`.
- `WindSpeedAdapter`: reads ERA5 `u_component_of_wind_10m` and `v_component_of_wind_10m`, then computes wind speed using `sqrt(u^2 + v^2)`.

This keeps the extractor reusable. Adding a future dataset should usually mean registering config and, only if needed, adding a small adapter.

## Shared Spatial Sampling

The framework creates one set of sampling points inside the Karnataka AOI and reuses those same points for every dataset.

Why this matters:

Each row in the final DataFrame represents the same geographical location across SST, wind speed, wave height, and chlorophyll.

Default sampling configuration:

- Sampling locations: `25`
- Sampling scale: `25000` meters
- Coordinate precision: `6`
- Seed: `42`

This strategy avoids mismatched coordinates between datasets.

## Temporal Alignment

Temporal helpers are implemented in `temporal.py`.

The current default analysis window is:

```text
2025-06-01 inclusive to 2025-06-02 exclusive
```

This date was selected because all currently supported datasets can be validated together for this period.

The validation CLI supports custom windows:

```powershell
analytics\.venv\Scripts\python.exe -B -m analytics.validation --start-date 2025-06-01 --end-date 2025-06-02
```

## Unified Environmental DataFrame

`pipeline.py` orchestrates the full multi-dataset flow:

1. Load AOI.
2. Create shared sampling points.
3. Validate each dataset independently.
4. Extract each parameter.
5. Merge outputs by shared sample location.
6. Return one environmental DataFrame.

Canonical raw environmental output:

```text
Latitude
Longitude
Date
SST
WindSpeed
WaveHeight
Chlorophyll
```

Example validation command:

```powershell
analytics\.venv\Scripts\python.exe -B -m analytics.validation --sample-limit 10 --scale-meters 25000
```

The validation prints sampled locations, valid observations, missing value statistics, execution time, and a DataFrame preview.

## Phase 3: Standardization and Quality Assurance

Phase 3 transforms the raw environmental DataFrame into a standardized, scientifically validated DataFrame ready for future storage.

New modules:

- `schemas.py`: defines `EnvironmentalRecord`.
- `metadata.py`: exposes parameter metadata.
- `standardizer.py`: standardizes data types and scientific units.
- `quality.py`: validates missing values, invalid values, outliers, duplicates, coordinates, and dates.
- `cleaner.py`: applies configurable cleaning policies.
- `report.py`: generates human-readable and machine-readable QA reports.

## Environmental Record Schema

The formal record structure is:

```text
EnvironmentalRecord
  latitude: float
  longitude: float
  date: datetime
  sst: float | None
  wind_speed: float | None
  wave_height: float | None
  chlorophyll: float | None
```

This schema is implemented in `analytics/schemas.py`.

## Metadata Architecture

Parameter metadata lives in `config.py` and is accessed through `metadata.py`.

Metadata includes parameter column, storage name, display name, source dataset, source band, unit, canonical unit, valid range, missing value policy, description, scale, and offset.

Analytics code should never hardcode scientific units or valid ranges. Those belong in metadata.

## Standard Units

| Parameter | Canonical Unit |
| --- | --- |
| SST | Celsius |
| WindSpeed | meters per second |
| WaveHeight | meters |
| Chlorophyll | mg/m^3 |

## Quality Validation

The QA layer checks:

- missing values
- invalid values outside configured ranges
- outliers using configured valid ranges
- duplicate observations
- invalid latitude
- invalid longitude
- invalid dates
- missing required columns

Duplicate observations are detected using:

```text
Latitude + Longitude + Date
```

## Cleaning Workflow

Cleaning is configurable through `CleaningConfig`.

Supported policies:

- remove invalid rows
- keep or drop duplicate rows
- keep missing values
- drop rows with missing parameter values
- fill missing values using configured values

Interpolation is intentionally not implemented yet. A future hook exists in `cleaner.py`.

## QA Reports

`report.py` returns a `QualityReport` containing:

- `clean_dataframe`: standardized and cleaned Pandas DataFrame
- `human_readable`: text summary for humans
- `summary`: dictionary summary for machines

The report includes rows sampled, rows retained, rows removed, duplicate observations, invalid identity rows, rows with quality issues, missing counts, invalid counts, outlier counts, valid counts, execution time, and units.

## Validation Tests

Python unit tests are implemented in:

```text
analytics/tests/test_quality_pipeline.py
```

The tests verify metadata loading, unit and column standardization, missing value detection, range checking, duplicate detection, invalid coordinate handling, configurable missing-value fill policy, report generation, and `EnvironmentalRecord` schema conversion.

Run tests:

```powershell
analytics\.venv\Scripts\python.exe -B -m unittest discover -s analytics\tests -v
```

## Phase 4: Persistence Layer

Phase 4 stores validated environmental observations through a clean SQLAlchemy persistence package.

Implemented modules:

- `persistence/database.py`: database engine and table helpers.
- `persistence/session.py`: transaction-safe session management.
- `persistence/models.py`: ORM models for observations, extraction runs, and dataset metadata.
- `persistence/repository.py`: reusable CRUD and query operations.
- `persistence/ingest.py`: validated DataFrame ingestion and extraction run tracking.
- `persistence/queries.py`: simple query helpers for future analytics modules.
- `persistence/exceptions.py`: custom persistence exceptions.

The persistence layer receives validated DataFrames only. It does not call Earth Engine, React Native, or Node.js.

## Phase 5: Deterministic Analytics

Phase 5 adds deterministic scoring after the validated environmental DataFrame is available.

Implemented outputs:

- `PFZScore`
- `PFZCategory`
- `RiskScore`
- `RiskCategory`
- `ConfidenceScore`
- `ConfidenceLabel`
- `Explanation`

The scoring engine is documented separately in:

```text
docs/DATA_ANALYTICS_MODEL.md
```

## Phase 6: End-to-End Persistence Pipeline

Phase 6 connects the existing framework components into one operational backend workflow.

Implemented behavior:

- Initialize Earth Engine using the existing authenticated setup.
- Run the environmental extraction pipeline.
- Run quality assurance and standardization.
- Store factual observations in `environmental_observations`.
- Retrieve newly inserted or updated observations for analytics.
- Run deterministic PFZ, risk, confidence, and explanation scoring.
- Store derived outputs in `analytics_results`.
- Return a structured execution summary.

The root entry point is:

```powershell
python run_pipeline.py
```

The pipeline is documented separately in:

```text
docs/DATABASE_INTEGRATION_PIPELINE.md
```

## Known Limitations

- Wave-height values may be missing for some sampled coastal locations.
- Chlorophyll data may be unavailable for some requested dates.
- Currents are deferred until a maintained dataset is finalized.
- Live PostgreSQL/PostGIS deployment is not implemented yet.
- REST API integration is not implemented yet.
- Scored outputs are persisted by the Phase 6 pipeline but are not served through REST APIs yet.
- Heatmap generation is not implemented yet.

## Current Output Contract

The current canonical cleaned DataFrame is the input for future storage and analytics:

```text
Latitude
Longitude
Date
SST
WindSpeed
WaveHeight
Chlorophyll
```

This DataFrame is the planned handoff point to PostgreSQL/PostGIS and later analytics modules.

The current scored output contract is:

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
