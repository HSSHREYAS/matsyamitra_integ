# MatsyaMitra Project Status

Last updated: 2026-08-10

## Overall Project Overview

MatsyaMitra is a Coastal Decision Support System for fishermen of Karnataka. The project is intended to combine satellite-derived ocean indicators, official advisories, and marine weather data to support fishing-zone guidance, risk-zone awareness, and operational decision support.

The project direction is deliberately rule-based and analytics-driven. Heavy ML fish prediction is out of scope for the current academic build.

## Current Software Architecture

The current codebase is a React Native Android application with mock data powering the UI, plus a TypeScript backend integration layer for operational marine weather ingestion. The Earth Engine analytics framework now supports extraction, multi-dataset integration, standardization, quality validation, cleaning, reporting, persistence abstractions, deterministic environmental scoring, and an end-to-end persistence pipeline. These analytics outputs are not yet integrated with the mobile API flow.

Current runtime layers:

- React Native Android app
- Bottom-tab mobile navigation
- Mock data modules for weather, alerts, PFZ-like fishing zones, and risk zones
- Google Maps SDK-backed map rendering through `react-native-maps`
- Local Android Maps API key loaded from `android/local.properties`
- Python analytics package under `analytics`
- Earth Engine extraction framework
- Pandas-based data standardization and quality assurance layer
- SQLAlchemy persistence layer for validated environmental observations
- Deterministic PFZ, risk, confidence, and explanation scoring engine
- End-to-end environmental data persistence pipeline
- TypeScript Open-Meteo operational marine ingestion

## Frontend Architecture

Frontend stack:

- React Native `0.84.1`
- React `19.2.3`
- TypeScript
- React Navigation bottom tabs
- `react-native-maps` for map rendering
- `@gorhom/bottom-sheet` for map detail panels
- `react-native-vector-icons` for iconography
- `react-native-linear-gradient` for visual styling

Main screens:

- Splash screen
- Home dashboard
- Map screen
- Alerts screen
- Profile screen

Key frontend folders:

- `src/screens`: app screens
- `src/components`: reusable UI components
- `src/components/map`: map overlays, controls, toggles, and bottom sheets
- `src/data`: mock data used until backend integration
- `src/theme`: colors, spacing, typography, and visual tokens

## Backend Architecture

A TypeScript backend integration layer now exists under `backend/marine` for Open-Meteo operational marine ingestion.

Planned backend responsibilities:

- Ingest official and external marine data sources
- Expose APIs for weather, fishing zones, risk zones, alerts, and advisories
- Receive or trigger rule-based PFZ/risk scoring outputs
- Serve processed map-ready layers to the mobile app
- Store spatial outputs in PostgreSQL/PostGIS

Current and planned backend stack:

- Node.js backend
- TypeScript Open-Meteo integration
- REST API initially
- PostgreSQL + PostGIS for geospatial storage
- Optional Python analytics service for satellite and scoring workflows

## Data Pipeline Architecture

Current state: Google Earth Engine foundation is configured and verified. The analytics framework can extract selected environmental datasets, merge them into one unified environmental DataFrame, transform that output into a standardized quality-checked DataFrame, persist validated observations through a repository layer, generate deterministic PFZ/risk/confidence scores for each stored observation, and persist those analytics results in a linked table. Open-Meteo now provides operational wind and wave inputs for MVP risk scoring through `marine_observations`; GEE-derived wind/wave remain reference values.

Current and planned pipeline:

1. Satellite data extraction through Google Earth Engine
2. Load canonical AOI from `analytics/data/geometry/karnataka_aoi.geojson`
3. Load datasets only through the centralized dataset registry
4. Filter ImageCollections by date and AOI
5. Clip selected images to the AOI
6. Sample all datasets at shared geographical locations
7. Merge SST, wind speed, wave height, and chlorophyll into one environmental DataFrame
8. Standardize data types and scientific units
9. Validate missing values, invalid values, outliers, duplicates, and identity fields
10. Clean observations using configurable policies
11. Generate machine-readable and human-readable QA reports
12. Store validated observations in `environmental_observations`
13. Retrieve newly inserted or updated observations for analytics
14. Apply deterministic PFZ suitability, marine risk, confidence, and explanation scoring
15. Store analytics outputs in `analytics_results`
16. Return an execution summary
17. Fetch Open-Meteo marine/forecast wind and wave data for canonical sampling points
18. Store hourly operational wind/wave data in `marine_observations`
19. Run operational MVP risk analytics from Open-Meteo wind/wave only
20. Later: ingest official PFZ advisories and hazard alerts
21. Later: normalize scored outputs into a backend API model
22. Later: generate map layers for fishing zones and risk zones
23. Later: store spatial outputs in PostGIS
24. Later: serve mobile-ready API responses

## Database Architecture

Database persistence architecture has been implemented in Python using SQLAlchemy ORM, with TypeScript PostgreSQL ingestion for Open-Meteo marine observations. Live PostgreSQL connection, table creation, Earth Engine pipeline execution, and Open-Meteo marine ingestion have been validated.

Current and planned database:

- PostgreSQL
- PostGIS extension

Implemented analytics tables:

- `environmental_observations`
- `extraction_runs`
- `dataset_metadata`
- `analytics_results`
- `marine_observations`

Planned application/backend entities:

- `users`
- `vessels`
- `ports`
- `fishing_zones`
- `risk_zones`
- `advisories`
- `alerts`
- `map_layer_snapshots`

## Technologies Used

Implemented:

- React Native
- TypeScript
- Android native project
- Gradle
- Google Maps SDK for Android through `react-native-maps`
- React Navigation
- Gorhom Bottom Sheet
- Vector Icons
- Python
- Google Earth Engine Python API
- Pandas
- NumPy
- GeoPandas
- Shapely
- PyArrow
- SQLAlchemy
- Alembic
- psycopg2-binary
- Python deterministic scoring modules
- Node.js TypeScript
- Open-Meteo Marine API
- Open-Meteo Forecast API
- `pg` PostgreSQL client

Planned:

- PostgreSQL
- PostGIS
- Firebase Cloud Messaging

## APIs Integrated

Implemented:

- Google Maps SDK for Android
- Google Earth Engine datasets through the Python API
- NOAA OISST v2.1
- ERA5 Hourly
- Copernicus Global Ocean Colour Bio-Geo-Chemical L4
- Open-Meteo marine/forecast endpoints for operational wind and wave ingestion

Mocked or pending:

- INCOIS PFZ advisories
- Marine weather APIs
- IMD or official warning feeds
- Firebase Cloud Messaging

## Google Earth Engine Foundation

Google Earth Engine setup has been completed for the project foundation.

Completed Earth Engine setup:

- Google Earth Engine Community tier has been successfully configured.
- Google Cloud Project has been linked.
- Python Earth Engine API has been installed.
- Authentication has been completed successfully.
- Earth Engine initialization has been verified using a test script.
- NOAA OISST dataset retrieval has been successfully tested.
- The initial Area of Interest has been finalized and stored as `analytics/data/geometry/karnataka_aoi.geojson`.

The GeoJSON at `analytics/data/geometry/karnataka_aoi.geojson` currently represents the canonical AOI for all extraction scripts.

## Earth Engine Extraction Framework

Phase 1 of the Earth Observation Pipeline has been implemented as a reusable framework rather than a single-use SST script.

Implemented modules:

- `analytics/config.py`: Google Cloud Project ID, AOI path, date configuration, sampling configuration, and dataset configuration model.
- `analytics/geometry.py`: loads the canonical AOI GeoJSON and converts it into an Earth Engine geometry.
- `analytics/datasets.py`: central dataset registry and reusable ImageCollection loading.
- `analytics/adapters.py`: isolated dataset adapters for generic one-band extraction and computed wind speed.
- `analytics/extractor.py`: generic ImageCollection filtering, AOI clipping, band normalization, and metadata attachment.
- `analytics/sampler.py`: generic raster sampling into a Pandas DataFrame with `Latitude`, `Longitude`, `Date`, `Parameter`, `Value`, and `Dataset` columns.
- `analytics/temporal.py`: reusable temporal-window helpers.
- `analytics/pipeline.py`: multi-dataset orchestration, shared sampling, independent dataset validation, and unified DataFrame generation.
- `analytics/validation.py`: validation runner using NOAA OISST v2.1 only to verify the generic framework.

Framework validation completed successfully using NOAA OISST v2.1. The validation verified authentication, AOI loading, dataset loading, filtering, clipping, sampling, and DataFrame generation.

The framework does not hardcode coordinates. Dataset IDs and band names are centralized in the dataset registry. Dataset-specific raw value scaling is handled through generic configuration fields, not through parameter-specific extractor logic.

## Multi-Dataset Environmental Pipeline

Phase 2 proved that the framework is generic by supporting every selected environmental parameter through the same extraction pipeline.

Supported outputs:

- `SST`: sea surface temperature from `NOAA/CDR/OISST/V2_1`
- `WindSpeed`: computed from ERA5 Hourly `u_component_of_wind_10m` and `v_component_of_wind_10m`
- `WaveHeight`: ERA5 Hourly `significant_height_of_combined_wind_waves_and_swell`
- `Chlorophyll`: Copernicus Global Ocean Colour Bio-Geo-Chemical L4 `CHL`

The unified environmental DataFrame columns are `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, and `Chlorophyll`.

The selected sampling strategy uses shared random points inside the Karnataka AOI. The default sampling resolution is `25000` meters with `25` requested sample locations. The same sampling points are reused for every dataset to avoid mismatched coordinates.

The temporal alignment strategy uses an inclusive start date and exclusive end date. The current default analysis window is `2025-06-01` to `2025-06-02`, selected because it validates SST, ERA5 wind, ERA5 wave height, and Copernicus chlorophyll together.

## Data Standardization and Quality Assurance

Phase 3 added a reusable QA layer that transforms raw environmental observations into a standardized, validated, storage-ready DataFrame.

Implemented modules:

- `analytics/schemas.py`: formal `EnvironmentalRecord` schema.
- `analytics/metadata.py`: parameter metadata registry accessors.
- `analytics/standardizer.py`: unit/type standardization.
- `analytics/quality.py`: missing value, invalid value, outlier, duplicate, coordinate, and date validation.
- `analytics/cleaner.py`: configurable cleaning policies and future interpolation hook.
- `analytics/report.py`: human-readable and machine-readable QA reporting.
- `analytics/tests/test_quality_pipeline.py`: unit tests for metadata loading, standardization, validation, cleaning, reporting, and schema conversion.

Canonical scientific units:

- SST: Celsius
- WindSpeed: meters per second
- WaveHeight: meters
- Chlorophyll: mg/m^3

Validation rules are configured through metadata in `analytics/config.py`. Analytics code must not hardcode scientific ranges or units outside the metadata/configuration layer.

## Validation Results

Recent validation completed:

- Phase 2 compact Earth Engine validation succeeded with SST, wind speed, wave height, and chlorophyll.
- Phase 3 QA pipeline unit tests passed: 8 tests.
- A compact real Earth Engine output was passed through the QA layer successfully.
- Phase 4 persistence unit tests passed, including 6 persistence tests.
- Phase 5 deterministic scoring tests passed.
- Phase 6 end-to-end persistence pipeline tests passed.
- Current local analytics suite passed: 32 tests.
- Open-Meteo marine integration TypeScript checks passed.
- Focused Open-Meteo marine Jest suite passed: 8 tests.
- Live Open-Meteo ingestion into PostgreSQL passed with 25 canonical locations, 25 valid wind values, and 25 valid wave values.
- Persistence sanity checks covered table creation, insertion, duplicate handling, query operations, delete helper, schema validation, and rollback behavior.
- Scoring sanity checks covered ideal, moderate, poor, dangerous, missing-parameter, invalid-value, freshness, category, DataFrame, and weight-redistribution behavior.
- End-to-end pipeline sanity checks covered observation insertion, analytics-result storage, duplicate skip/update behavior, foreign-key-linked results, and transaction rollback when analytics generation fails.
- Open-Meteo sanity checks covered batched requests, response mapping, canonical coordinate preservation, source grid coordinate traceability, missing/invalid values, duplicate-safe PostgreSQL persistence, retrieval, and operational risk scoring from Open-Meteo wind/wave only.

Known validation behavior:

- Wave-height values can be missing for some sampled locations due to coastal/ocean coverage.
- Chlorophyll validation succeeds for the default `2025-06-01` to `2025-06-02` analysis window.

## Persistence Layer

Phase 4 added a reusable persistence layer under `analytics/persistence`. This layer is independent from Earth Engine, extraction, analytics, React Native, and Node.js.

Implemented modules:

- `analytics/persistence/database.py`: SQLAlchemy engine creation and table creation/drop helpers.
- `analytics/persistence/session.py`: transaction-safe session scope handling.
- `analytics/persistence/models.py`: ORM models for environmental observations, extraction runs, and dataset metadata.
- `analytics/persistence/repository.py`: reusable CRUD/query operations that return plain records instead of exposing ORM models.
- `analytics/persistence/ingest.py`: validated DataFrame schema validation, run tracking, dataset metadata upsert, and observation insertion.
- `analytics/persistence/queries.py`: simple query helpers for future analytics modules.
- `analytics/persistence/exceptions.py`: persistence-specific custom exceptions.
- `analytics/persistence/migrations`: Alembic-ready migration structure.

Implemented tables:

- `environmental_observations`
- `extraction_runs`
- `dataset_metadata`

The persistence layer stores only validated environmental observations with `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, and `Chlorophyll`.

Retention configuration exists through `MATSYAMITRA_DATA_RETENTION_DAYS` with a default of `7`, but automatic deletion and scheduled cleanup are intentionally not implemented in this phase.

## Deterministic Environmental Analytics Engine

Phase 5 added a deterministic scoring engine under `analytics/scoring`. This layer consumes validated environmental records only and is independent from Earth Engine, PostgreSQL, Node.js, REST APIs, React Native, heatmaps, scheduling, and machine learning.

Implemented modules:

- `analytics/scoring/config.py`: centralized scoring thresholds, weights, categories, valid ranges, and freshness factors.
- `analytics/scoring/models.py`: scoring input/output schemas and internal scoring result structures.
- `analytics/scoring/normalization.py`: generic suitability, risk normalization, value validation, clamping, and weight redistribution helpers.
- `analytics/scoring/pfz.py`: deterministic Potential Fishing Zone suitability score calculation.
- `analytics/scoring/risk.py`: deterministic marine risk score calculation.
- `analytics/scoring/confidence.py`: data availability and freshness-based confidence scoring.
- `analytics/scoring/categories.py`: score-to-label category mapping.
- `analytics/scoring/explain.py`: short human-readable explanation generation.
- `analytics/scoring/engine.py`: public `score_record()` and `score_dataframe()` interface.
- `analytics/scoring/tests.py`: deterministic scoring unit tests.

Scoring outputs:

- `PFZScore`
- `PFZCategory`
- `RiskScore`
- `RiskCategory`
- `ConfidenceScore`
- `ConfidenceLabel`
- `Explanation`

The PFZ score uses SST, chlorophyll, and wind suitability. The risk score uses wave height and wind risk. Missing or invalid parameters do not crash the engine; available parameter weights are redistributed within the relevant score. Confidence is reduced based on missing/invalid inputs and observation freshness.

Phase 5 validation completed successfully and is now covered by the current 32-test analytics suite.

## End-to-End Persistence Pipeline

Phase 6 connected the existing extraction, quality assurance, persistence, and deterministic analytics components into one operational backend pipeline.

Implemented modules:

- `analytics/end_to_end_pipeline.py`: orchestrates Earth Engine initialization, extraction, QA, standardized observation persistence, deterministic scoring, analytics result persistence, and execution summary generation.
- `run_pipeline.py`: root command-line entry point for running the full pipeline with one command.
- `analytics/tests/test_end_to_end_pipeline.py`: tests for observation storage, analytics result storage, duplicate skip/update behavior, and rollback on analytics failure.

Implemented database behavior:

- `environmental_observations` remains factual-only and is the source of truth for validated environmental records.
- `analytics_results` stores deterministic PFZ, risk, confidence, and explanation outputs.
- Each analytics result references one environmental observation through a foreign key.
- Duplicate observation handling supports configurable `skip`, `replace`, and `update` policies.
- The database insertion and analytics storage stages execute inside one transaction.
- If observation insertion, analytics generation, or analytics-result insertion fails, the transaction rolls back.

The analytics engine still never communicates with Google Earth Engine. It receives only validated environmental observations that have passed through the extraction and QA pipeline.

## Operational Marine Wind/Wave Integration

The operational MVP risk source now uses Open-Meteo wind and wave values stored in `marine_observations`.

Implemented modules:

- `backend/marine/config.ts`: configurable Open-Meteo base URLs, database URL, duplicate policy, and sampling-point path.
- `backend/marine/samplingPoints.ts`: canonical sampling-point GeoJSON loader.
- `backend/marine/openMeteoClient.ts`: batched Open-Meteo fetching, JSON parsing, response mapping, validation, and source-grid metadata handling.
- `backend/marine/repository.ts`: PostgreSQL table creation, duplicate-safe persistence, and retrieval for `marine_observations`.
- `backend/marine/risk.ts`: operational MVP risk scoring using Open-Meteo wind speed and wave height only.
- `backend/marine/ingest.ts`: end-to-end marine ingestion operation.
- `backend/marine/liveMarineIngestion.ts`: live validation command used by `npm run marine:live`.
- `__tests__/marineOpenMeteo.test.ts`: focused TypeScript/Jest validation.

Canonical sampling points:

- `analytics/data/geometry/sampling_points.geojson`
- 25 stable WGS84 points with `location_id` values `KARN_001` through `KARN_025`
- Reused by both GEE extraction and Open-Meteo ingestion

Operational risk decision:

- PFZ continues to use GEE-derived SST and chlorophyll.
- GEE-derived wind and wave remain stored in `environmental_observations` for reference/validation only.
- MVP operational risk uses Open-Meteo wind speed and wave height from `marine_observations`.
- Open-Meteo returned grid coordinates are stored separately as `source_latitude` and `source_longitude`; canonical MatsyaMitra coordinates remain the frontend/map coordinates.

Live validation result on 2026-08-10:

- Requested locations: 25
- Parsed observations: 25
- Inserted on first live pass: 25
- Updated after wind-source correction: 25
- Valid wind speed values: 25
- Valid wave height values: 25
- Observation timestamp: 2026-08-10 23:00 IST

## Google Earth Engine Datasets Selected

Finalized dataset stack:

- SST: `NOAA/CDR/OISST/V2_1`
- Chlorophyll: Copernicus Global Ocean Colour Bio-Geo-Chemical L4
- Chlorophyll secondary source: JAXA GCOM-C/SGLI
- Chlorophyll validation source: MODIS Aqua
- Wind: ERA5 Hourly using `u10` and `v10`
- Wave Height: ERA5 Hourly using Significant Wave Height
- Currents: pending evaluation because currently available HYCOM datasets are historical.

The current milestone is to prepare scored environmental outputs for future database/backend integration and geospatial visualization.

## Folder Structure

Current important folders:

- `android`: native Android app configuration
- `ios`: generated iOS project, not the current target platform
- `assets`: root-level image assets
- `src`: React Native application source
- `src/assets`: app image assets
- `src/components`: reusable UI components
- `src/data`: mock data
- `src/navigation`: root and bottom tab navigation
- `src/screens`: app screens
- `src/theme`: design system tokens
- `analytics/data/geometry`: canonical geospatial inputs such as `karnataka_aoi.geojson`
- `analytics/config.py`: Earth Engine framework configuration
- `analytics/geometry.py`: canonical AOI loader
- `analytics/datasets.py`: centralized Earth Engine dataset registry
- `analytics/adapters.py`: dataset-specific transformation adapters
- `analytics/extractor.py`: generic ImageCollection extraction and clipping
- `analytics/sampler.py`: generic raster sampling to Pandas
- `analytics/pipeline.py`: multi-dataset environmental pipeline
- `analytics/temporal.py`: temporal alignment helpers
- `analytics/schemas.py`: formal environmental record schema
- `analytics/metadata.py`: environmental parameter metadata
- `analytics/standardizer.py`: unit and type standardization
- `analytics/quality.py`: data validation rules and summaries
- `analytics/cleaner.py`: cleaning policies
- `analytics/report.py`: QA report generation
- `analytics/validation.py`: framework and pipeline validation CLI
- `analytics/tests`: Python unit tests for the analytics framework
- `analytics/persistence`: SQLAlchemy persistence layer for validated environmental observations
- `analytics/persistence/migrations`: Alembic-ready migration structure
- `analytics/scoring`: deterministic PFZ, risk, confidence, and explanation scoring engine
- `analytics/end_to_end_pipeline.py`: Phase 6 operational pipeline connecting extraction, QA, persistence, and scoring
- `analytics/data/geometry/sampling_points.geojson`: canonical 25-point sampling dataset
- `backend/marine`: TypeScript Open-Meteo operational wind/wave ingestion and risk integration
- `run_pipeline.py`: one-command pipeline entry point
- `docs`: project documentation

## Important Implementation Decisions

- Android is the primary platform.
- Node.js backend exists per project context; the mobile app currently uses mock data until API integration is wired.
- Google Maps SDK is used as the native map provider for Android.
- Public OpenStreetMap tiles were removed from the Map screen after tile access returned `403 Access blocked`.
- The Map screen currently uses the Google basemap and overlays mock PFZ/risk geometry.
- Google Maps API key is read from `android/local.properties` using `GOOGLE_MAPS_API_KEY`.
- Heavy ML prediction is not part of the project direction.
- Rule-based analytics and optional fuzzy scoring are preferred.
- `analytics/data/geometry/karnataka_aoi.geojson` is the canonical AOI for Earth Engine extraction scripts.
- NOAA OISST is the finalized SST source for the first extraction pipeline.
- NOAA OISST v2.1 is used only as the Phase 1 validation dataset, not as a hardcoded extraction script.
- Extraction code must use the dataset registry rather than hardcoding Earth Engine dataset IDs.
- Coordinates must never be hardcoded in extraction modules; the AOI GeoJSON is the source of truth.
- Generic dataset configuration supports scale and offset handling for raw raster values.
- Dataset-specific behavior is isolated in adapters; the extractor remains provider-neutral.
- Wind speed is computed as `sqrt(u^2 + v^2)` in the ERA5 wind adapter.
- Shared spatial sampling is used across all datasets so merged rows represent the same location.
- Scientific units, valid ranges, and cleaning policies live in configuration and metadata.
- The cleaned QA DataFrame is the canonical input for future PostgreSQL/PostGIS and analytics phases.
- The persistence layer receives only validated DataFrames and must remain independent from Earth Engine and extraction code.
- Future analytics modules should use repository/query helpers instead of writing SQL directly.
- Automatic retention cleanup is deferred to a future infrastructure/scheduling phase.
- PFZ, risk, confidence, and explanation scoring are deterministic and config-driven.
- Scoring modules consume validated observations only and must not call Earth Engine, SQLAlchemy, backend APIs, or UI code.
- Missing PFZ/risk parameters trigger weight redistribution instead of hard failure.
- Confidence combines parameter availability with data freshness.
- Environmental observations and analytics results are separated into factual and derived tables.
- `analytics_results` must reference `environmental_observations`; analytics results cannot exist without a source observation.
- Phase 6 duplicate policy is configurable through `MATSYAMITRA_DUPLICATE_POLICY`.
- Open-Meteo marine observation duplicate handling uses `location_id + observation_timestamp + source`.
- Operational MVP risk uses Open-Meteo wind/wave values, not GEE wind/wave values.
- Open-Meteo wave height is fetched from the Marine API; `wind_speed_10m` is fetched from the Open-Meteo Forecast API because the current Marine API does not return that variable.

## Completed Modules

- React Native app shell
- Splash screen
- Home dashboard UI
- Alerts UI
- Profile UI
- Bottom tab navigation
- Mock weather/advisory/alert/zone data
- Map screen with Google Maps-backed base map
- Fishing-zone polygon and marker overlay
- Risk-zone circle and marker overlay
- PFZ/Risk toggle UI
- Map zoom/reset controls
- Google Maps Android API key placeholder integration
- Google Earth Engine Community tier configured
- Google Cloud Project linked
- Python Earth Engine API installed
- Earth Engine authentication completed
- Earth Engine initialization verified
- NOAA OISST retrieval tested
- Karnataka AOI finalized
- Dataset stack finalized for SST, chlorophyll, wind, wave height, and currents evaluation
- Reusable Earth Engine framework module structure implemented
- Canonical AOI loader implemented
- Centralized dataset registry implemented
- Generic ImageCollection filtering and clipping implemented
- Generic raster sampling to Pandas DataFrame implemented
- NOAA OISST framework validation completed successfully
- Dataset adapters implemented
- ERA5 wind speed computation implemented
- ERA5 wave-height extraction implemented
- Copernicus chlorophyll extraction implemented
- Shared sampling strategy implemented
- Temporal alignment utilities implemented
- Unified environmental DataFrame implemented
- Environmental record schema implemented
- Metadata registry implemented
- Unit standardization implemented
- Data quality validation implemented
- Configurable cleaning pipeline implemented
- Human-readable and machine-readable QA reporting implemented
- Python unit tests added for the QA pipeline
- SQLAlchemy ORM persistence models implemented
- Transaction-safe session management implemented
- DataFrame ingestion layer implemented
- Extraction run tracking implemented
- Dataset metadata persistence implemented
- Repository/query layer implemented
- Duplicate observation handling implemented
- Alembic-ready migration structure added
- Persistence unit tests added
- Deterministic PFZ scoring implemented
- Deterministic marine risk scoring implemented
- Confidence scoring implemented
- Human-readable scoring explanations implemented
- Scoring DataFrame interface implemented
- Scoring unit tests added
- Analytics results table implemented
- End-to-end persistence pipeline implemented
- One-command `run_pipeline.py` entry point implemented
- Configurable duplicate policy implemented for `skip`, `replace`, and `update`
- Transaction rollback tests added for pipeline-level analytics failures
- Canonical `sampling_points.geojson` implemented
- Open-Meteo operational wind/wave ingestion implemented
- `marine_observations` table implemented
- Operational risk scoring from Open-Meteo wind/wave implemented
- Live Open-Meteo PostgreSQL ingestion validated
- Local documentation system initialized

## Pending Modules

- Backend integration for analytics outputs
- Authentication
- Real weather/marine API integration
- PostGIS geometry migration
- Retention cleanup utility
- Scheduled ingestion workflow
- INCOIS PFZ ingestion
- Heatmap generation
- Backend API integration for scored outputs
- PostgreSQL/PostGIS live deployment
- Notifications
- Deployment
- Production signing and release configuration

## Known Issues

- Earth Engine extraction outputs are not integrated with the Node.js backend yet.
- Deterministic scoring outputs are persisted by the Phase 6 pipeline but are not exposed through REST APIs yet.
- Open-Meteo marine observations are persisted but not exposed through REST APIs yet.
- All domain data in the app is mock data.
- Map overlays are static mock geometry.
- Heatmap layer is not implemented.
- Wave-height values may be missing for some sampled locations depending on coastal/ocean mask coverage.
- Chlorophyll availability depends on the requested analysis date.
- Currents dataset selection remains pending because available HYCOM datasets are historical.
- Persistence tests currently use SQLite for isolated local validation; live PostgreSQL validation is still pending.
- Google Maps key is configured for local Android builds; production builds will need release SHA-1 restrictions.
- Some generated text or encoding artifacts may remain from earlier UI generation.
- Lint had historical unused-variable warnings in files outside the latest map edits.

## Assumptions

- Target geography is Karnataka coast.
- Android is the primary platform for the academic/demo build.
- The app can use Google Maps SDK for base map rendering.
- Satellite extraction will happen server-side or in a separate processing service, not directly in the mobile app.
- Government/advisory scraping, if needed, will happen in backend jobs.
- The canonical AOI for extraction is `analytics/data/geometry/karnataka_aoi.geojson`.
- The current end-to-end pipeline can ingest validated observations and store analytics results through the persistence layer, but live PostgreSQL deployment is still pending.
- The current scoring output can be generated from validated records, but the app still displays mock PFZ/risk overlays until backend/API integration is implemented.

## Environment Variables

Current local Android property:

- `GOOGLE_MAPS_API_KEY`: stored in `android/local.properties`

Current analytics/persistence properties:

- `MATSYAMITRA_DATABASE_URL`: required for live PostgreSQL connections.
- `MATSYAMITRA_DATABASE_ECHO`: optional SQLAlchemy SQL logging toggle.
- `MATSYAMITRA_DATABASE_POOL_PRE_PING`: optional SQLAlchemy connection health check toggle.
- `MATSYAMITRA_DATABASE_SCHEMA_VERSION`: persistence schema version.
- `MATSYAMITRA_OBSERVATIONS_TABLE`: optional observations table name override.
- `MATSYAMITRA_RUNS_TABLE`: optional extraction runs table name override.
- `MATSYAMITRA_METADATA_TABLE`: optional dataset metadata table name override.
- `MATSYAMITRA_ANALYTICS_RESULTS_TABLE`: optional analytics results table name override.
- `MATSYAMITRA_DATA_RETENTION_DAYS`: retention policy value for future cleanup tooling, default `7`.
- `MATSYAMITRA_DUPLICATE_POLICY`: Phase 6 duplicate observation policy, supports `skip`, `replace`, or `update`.
- `MATSYAMITRA_ANALYTICS_VERSION`: analytics version label stored with generated analytics results.
- `MATSYAMITRA_MARINE_OBSERVATIONS_TABLE`: optional marine observations table name override.
- `OPEN_METEO_MARINE_BASE_URL`: optional Open-Meteo Marine API base URL override.
- `OPEN_METEO_FORECAST_BASE_URL`: optional Open-Meteo Forecast API base URL override for `wind_speed_10m`.
- `MATSYAMITRA_SAMPLING_POINTS_PATH`: optional canonical sampling-point GeoJSON override.

Planned:

- backend API base URL
- Google Earth Engine credentials
- Firebase configuration
- weather API credentials

## External Services

Implemented:

- Google Maps Platform: Maps SDK for Android
- Google Earth Engine
- Google Cloud Project linked to Earth Engine
- SQLAlchemy ORM
- Alembic migration tooling
- Open-Meteo Marine API
- Open-Meteo Forecast API

Planned:

- INCOIS data/advisory source
- Marine weather data source
- Firebase Cloud Messaging
- PostgreSQL/PostGIS hosting

## Version History of Major Architectural Decisions

- 2026-04: React Native Android app scaffolded and UI screens generated.
- 2026-04: Project direction finalized as Coastal Decision Support System using satellite analytics and rule-based DSS logic.
- 2026-04: Mock data used for frontend validation while backend remains pending.
- 2026-04: Android build configuration fixed with compatible Gradle/JDK setup.
- 2026-04: Google Maps SDK requirement identified for `react-native-maps` Android rendering.
- 2026-06: Google Maps API key integration added through Android manifest placeholder and `local.properties`.
- 2026-06: Public OSM tile usage removed after blocked tile responses.
- 2026-07: Project documentation lifecycle initialized under `docs`.
- 2026-07: Google Earth Engine Community tier, Google Cloud Project link, Python API setup, authentication, initialization verification, NOAA OISST test retrieval, AOI finalization, and dataset stack finalization completed.
- 2026-07: Reusable Earth Engine extraction framework implemented and validated with NOAA OISST v2.1 as a validation dataset only.
- 2026-07: Multi-dataset environmental pipeline implemented for SST, wind speed, wave height, and chlorophyll with shared spatial sampling and temporal alignment.
- 2026-07: Environmental data standardization and quality assurance layer implemented with metadata-driven validation, cleaning, reports, schema definitions, and unit tests.
- 2026-07: SQLAlchemy persistence layer implemented for validated environmental observations with repository/query abstractions, ingestion summaries, extraction run tracking, dataset metadata storage, Alembic-ready structure, duplicate handling, and rollback-tested unit tests.
- 2026-07: Deterministic environmental analytics engine implemented for PFZ suitability, marine risk, confidence scoring, and human-readable explanations with config-driven thresholds and unit-tested behavior.
- 2026-08: End-to-end environmental data persistence pipeline implemented with factual observation storage, linked analytics result storage, configurable duplicate policies, one-command execution, and transaction rollback tests.
- 2026-08: Operational marine wind/wave source integration implemented using canonical 25-point sampling, Open-Meteo wave/wind ingestion, `marine_observations`, and MVP risk scoring from Open-Meteo values only.
