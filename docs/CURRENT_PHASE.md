# Current Phase: Analytics Input Preparation

Last updated: 2026-07-05

## Objective

Prepare future analytics modules to consume validated environmental observations through the repository layer without accessing SQL directly.

## Deliverables

- Define query contracts needed by future PFZ and risk scoring
- Keep analytics independent from SQLAlchemy models
- Confirm persistence output remains the canonical input for future analytics
- Avoid PFZ/risk scoring until the next analytics phase is explicitly started

## Current Status

| Area | Status |
| --- | --- |
| Earth Engine API | DONE |
| Authentication | DONE |
| AOI Finalized | DONE |
| Dataset Selection | DONE |
| Reusable Framework Modules | DONE |
| Multi-Dataset Extraction Pipeline | DONE |
| Shared Spatial Sampling | DONE |
| Temporal Alignment | DONE |
| Unified Environmental DataFrame | DONE |
| Metadata Registry | DONE |
| Data Standardization | DONE |
| Quality Validation | DONE |
| Cleaning Pipeline | DONE |
| QA Report Generation | DONE |
| SQLAlchemy Persistence Models | DONE |
| Database Session Handling | DONE |
| Repository Layer | DONE |
| DataFrame Ingestion Layer | DONE |
| Query Utilities | DONE |
| Alembic-Ready Structure | DONE |
| Persistence Unit Tests | DONE |
| Live PostgreSQL Deployment | TODO |

## Tasks

| Task | Status |
| --- | --- |
| Implement reusable Earth Engine module structure | DONE |
| Load canonical AOI from `analytics/data/geometry/karnataka_aoi.geojson` | DONE |
| Implement centralized dataset registry | DONE |
| Implement dataset adapters | DONE |
| Compute wind speed from ERA5 `u10` and `v10` | DONE |
| Implement shared sampling locations across datasets | DONE |
| Implement reusable temporal window utilities | DONE |
| Produce unified environmental DataFrame | DONE |
| Implement environmental record schema | DONE |
| Implement metadata-driven validation rules | DONE |
| Implement unit standardization | DONE |
| Implement missing/outlier/invalid/duplicate detection | DONE |
| Implement configurable cleaning policies | DONE |
| Implement machine-readable and human-readable QA reports | DONE |
| Add Python unit tests for QA pipeline | DONE |
| Add SQLAlchemy database configuration | DONE |
| Implement `EnvironmentalObservation` ORM model | DONE |
| Implement `ExtractionRun` ORM model | DONE |
| Implement `DatasetMetadata` ORM model | DONE |
| Implement transaction-safe session handling | DONE |
| Implement reusable repository methods | DONE |
| Implement validated DataFrame ingestion | DONE |
| Implement duplicate observation handling | DONE |
| Implement query helpers | DONE |
| Implement rollback tests | DONE |
| Add Alembic-ready migration structure | DONE |
| Provision live PostgreSQL database | TODO |
| Validate persistence against live PostgreSQL | TODO |

## Dependencies

- Existing Earth Engine authentication
- Canonical AOI file at `analytics/data/geometry/karnataka_aoi.geojson`
- Python packages already installed in `analytics/.venv`
- Pandas for standardization, validation, cleaning, and reporting
- SQLAlchemy ORM
- Alembic
- PostgreSQL driver `psycopg2-binary`
- Future live PostgreSQL environment

## Risks

- Wave-height observations may be missing for some sampled coastal points.
- Chlorophyll availability depends on the requested analysis date.
- Currents remain deferred until a maintained dataset is finalized.
- Database schema must preserve scientific units and quality metadata.
- Persistence tests currently use SQLite for isolated local validation; live PostgreSQL validation is still pending.

## Notes

- The current canonical cleaned output columns are `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, and `Chlorophyll`.
- The persistence layer receives only validated DataFrames and is independent from Earth Engine, extraction, Node.js, and React Native.
- No REST API, PFZ scoring, risk scoring, heatmaps, scheduling, retention cleanup, or React Native UI work has been implemented in Phase 4.
- Documentation for the complete framework is available in `docs/DATA_EXTRACTION_FRAMEWORK.md`.
