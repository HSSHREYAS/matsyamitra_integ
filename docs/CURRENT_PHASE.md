# Current Phase: Environmental Data Storage Preparation

Last updated: 2026-07-05

## Objective

Prepare the validated Earth observation output for future PostgreSQL/PostGIS integration without implementing the database yet.

## Deliverables

- Review the standardized DataFrame schema for database readiness
- Decide storage table structure for environmental observations
- Decide geospatial representation for sampling points
- Define migration approach for PostgreSQL + PostGIS
- Keep analytics output independent from backend and UI concerns

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
| PostgreSQL/PostGIS Integration | TODO |

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
| Design PostgreSQL/PostGIS schema | TODO |
| Integrate cleaned DataFrame with storage layer | TODO |

## Dependencies

- Existing Earth Engine authentication
- Canonical AOI file at `analytics/data/geometry/karnataka_aoi.geojson`
- Python packages already installed in `analytics/.venv`
- Pandas for standardization, validation, cleaning, and reporting
- Future PostgreSQL/PostGIS environment

## Risks

- Wave-height observations may be missing for some sampled coastal points.
- Chlorophyll availability depends on the requested analysis date.
- Currents remain deferred until a maintained dataset is finalized.
- Database schema must preserve scientific units and quality metadata.

## Notes

- The current canonical cleaned output columns are `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, and `Chlorophyll`.
- No PostgreSQL, REST API, PFZ scoring, risk scoring, heatmaps, or React Native UI work has been implemented in the analytics phases.
- Documentation for the complete framework is available in `docs/DATA_EXTRACTION_FRAMEWORK.md`.
