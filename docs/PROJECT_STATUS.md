# MatsyaMitra Project Status

Last updated: 2026-07-31

## Overall Project Overview

MatsyaMitra is a Coastal Decision Support System for fishermen of Karnataka. The project is intended to combine satellite-derived ocean indicators, official advisories, and marine weather data to support fishing-zone guidance, risk-zone awareness, and operational decision support.

The project direction is deliberately rule-based and analytics-driven. Heavy ML fish prediction is out of scope for the current academic build.

## Current Software Architecture

The current codebase is a React Native Android application with mock data powering the UI, plus an existing Node.js backend per project context. The Earth Engine analytics framework now supports extraction, multi-dataset integration, standardization, quality validation, cleaning, reporting, persistence abstractions, and deterministic environmental scoring. These analytics outputs are not yet integrated with the backend or mobile API flow.

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

A Node.js backend exists per project context. This phase does not modify backend code.

Planned backend responsibilities:

- Ingest official and external marine data sources
- Expose APIs for weather, fishing zones, risk zones, alerts, and advisories
- Receive or trigger rule-based PFZ/risk scoring outputs
- Serve processed map-ready layers to the mobile app
- Store spatial outputs in PostgreSQL/PostGIS

Current and planned backend stack:

- Node.js backend
- REST API initially
- PostgreSQL + PostGIS for geospatial storage
- Optional Python analytics service for satellite and scoring workflows

## Data Pipeline Architecture

Current state: Google Earth Engine foundation is configured and verified. The analytics framework can extract selected environmental datasets, merge them into one unified environmental DataFrame, transform that output into a standardized quality-checked DataFrame, persist validated observations through a repository layer, and generate deterministic PFZ/risk/confidence scores for each validated observation.

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
12. Store validated observations through the persistence layer when a configured database is available
13. Apply deterministic PFZ suitability, marine risk, confidence, and explanation scoring
14. Later: ingest official PFZ advisories, marine weather, and hazard alerts
15. Later: normalize scored outputs into a backend data model
16. Later: generate map layers for fishing zones and risk zones
17. Later: store spatial outputs in PostGIS
18. Later: serve mobile-ready API responses

## Database Architecture

Database persistence architecture has been implemented in Python using SQLAlchemy ORM. Live PostgreSQL provisioning and validation are still pending.

Current and planned database:

- PostgreSQL
- PostGIS extension

Implemented analytics tables:

- `environmental_observations`
- `extraction_runs`
- `dataset_metadata`

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
- Current local analytics suite passed: 27 tests.
- Persistence sanity checks covered table creation, insertion, duplicate handling, query operations, delete helper, schema validation, and rollback behavior.
- Scoring sanity checks covered ideal, moderate, poor, dangerous, missing-parameter, invalid-value, freshness, category, DataFrame, and weight-redistribution behavior.

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

Phase 5 validation completed successfully with 27 analytics tests passing, including persistence, QA, and scoring tests.

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
- Local documentation system initialized

## Pending Modules

- Backend integration for analytics outputs
- Authentication
- Real weather/marine API integration
- Live PostgreSQL database provisioning
- Live PostgreSQL persistence validation
- PostGIS geometry migration
- Retention cleanup utility
- Scheduled ingestion workflow
- INCOIS PFZ ingestion
- Heatmap generation
- Scored output persistence/integration
- Backend API integration for scored outputs
- PostgreSQL/PostGIS live deployment
- Notifications
- Deployment
- Production signing and release configuration

## Known Issues

- Earth Engine extraction outputs are not integrated with the Node.js backend yet.
- Deterministic scoring outputs are not persisted or exposed through REST APIs yet.
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
- The current analytics output can be ingested through the persistence layer, but live PostgreSQL deployment is still pending.
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
- `MATSYAMITRA_DATA_RETENTION_DAYS`: retention policy value for future cleanup tooling, default `7`.

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
