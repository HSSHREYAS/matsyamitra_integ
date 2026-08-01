# Current Phase: Backend API Integration Preparation

Last updated: 2026-08-01

## Objective

Prepare the completed end-to-end environmental persistence pipeline for future backend API integration, without implementing REST APIs, heatmaps, scheduling, Node.js integration, or React Native changes in this phase.

## Deliverables

- Keep Earth Engine extraction, QA, factual observation persistence, deterministic scoring, and analytics-result persistence connected through one pipeline.
- Preserve strict separation between factual environmental observations and derived analytics results.
- Keep the analytics engine independent from Earth Engine and database internals.
- Document the current database integration contract for future backend/API work.

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
| EnvironmentalObservations Table | DONE |
| DatasetMetadata Table | DONE |
| ExtractionRuns Table | DONE |
| AnalyticsResults Table | DONE |
| Database Session Handling | DONE |
| Repository Layer | DONE |
| DataFrame Ingestion Layer | DONE |
| Query Utilities | DONE |
| Alembic-Ready Structure | DONE |
| PFZ Score Generation | DONE |
| Risk Score Generation | DONE |
| Confidence Score Generation | DONE |
| Scoring Explanations | DONE |
| End-to-End Pipeline Orchestration | DONE |
| Configurable Duplicate Policy | DONE |
| Transaction Rollback Coverage | DONE |
| Pipeline Unit Tests | DONE |
| Live PostgreSQL Provisioning | TODO |
| REST API Integration | TODO |
| Heatmap Generation | TODO |
| React Native Visualization Integration | TODO |

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
| Implement `AnalyticsResult` ORM model | DONE |
| Implement transaction-safe session handling | DONE |
| Implement reusable repository methods | DONE |
| Implement validated DataFrame ingestion | DONE |
| Implement duplicate observation handling | DONE |
| Implement `skip`, `replace`, and `update` duplicate policies | DONE |
| Implement query helpers | DONE |
| Implement rollback tests | DONE |
| Add Alembic-ready migration structure | DONE |
| Implement config-driven scoring thresholds and categories | DONE |
| Implement generic normalization utilities | DONE |
| Implement PFZ suitability scoring | DONE |
| Implement marine risk scoring | DONE |
| Implement confidence scoring | DONE |
| Implement scoring explanations | DONE |
| Implement `score_record()` public interface | DONE |
| Implement `score_dataframe()` batch interface | DONE |
| Add deterministic scoring tests | DONE |
| Implement end-to-end pipeline orchestration | DONE |
| Add root `run_pipeline.py` command | DONE |
| Store analytics results linked to observations | DONE |
| Add Phase 6 pipeline tests | DONE |
| Provision live PostgreSQL database | TODO |
| Validate end-to-end pipeline against live PostgreSQL | TODO |
| Expose scored outputs through backend API | TODO |
| Generate heatmap-ready layers | TODO |

## Dependencies

- Existing Earth Engine authentication
- Canonical AOI file at `analytics/data/geometry/karnataka_aoi.geojson`
- Python packages already installed in `analytics/.venv`
- Pandas for DataFrame processing
- SQLAlchemy for persistence
- Existing validated DataFrame contract: `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, `Chlorophyll`
- Future live PostgreSQL environment
- Future backend API integration

## Risks

- The end-to-end pipeline is unit-tested with SQLite but still needs live PostgreSQL validation.
- Running `python run_pipeline.py` requires `MATSYAMITRA_DATABASE_URL` to point to a reachable database.
- Earth Engine extraction still depends on dataset availability for the requested date window.
- Heatmap visualization will require a separate aggregation/interpolation design and is intentionally not implemented yet.

## Notes

- `environmental_observations` stores factual environmental observations only.
- `analytics_results` stores derived PFZ, risk, confidence, and explanation outputs linked by foreign key.
- The analytics engine receives validated observations only and does not call Earth Engine directly.
- Duplicate handling for the pipeline is configured with `MATSYAMITRA_DUPLICATE_POLICY`.
- Current tests pass with `analytics\.venv\Scripts\python.exe -B -m unittest discover -s analytics\tests -v`.
- Documentation for the database integration pipeline is available in `docs/DATABASE_INTEGRATION_PIPELINE.md`.
