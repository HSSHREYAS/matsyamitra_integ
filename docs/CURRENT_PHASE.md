# Current Phase: Scored Output Integration Preparation

Last updated: 2026-07-31

## Objective

Prepare the completed deterministic analytics outputs for the next integration milestone without adding REST APIs, heatmaps, scheduling, or React Native changes in this phase.

## Deliverables

- Keep Phase 5 scoring engine complete and isolated from Earth Engine, database, backend, and UI layers.
- Confirm validated environmental records can be converted into PFZ, risk, confidence, and explanation outputs.
- Keep scored output contracts documented for future persistence, REST API, and visualization work.
- Identify the next implementation boundary for backend/database integration.

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
| PFZ Score Generation | DONE |
| Risk Score Generation | DONE |
| Confidence Score Generation | DONE |
| Scoring Explanations | DONE |
| Scoring Unit Tests | DONE |
| Scored Output Persistence | TODO |
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
| Implement transaction-safe session handling | DONE |
| Implement reusable repository methods | DONE |
| Implement validated DataFrame ingestion | DONE |
| Implement duplicate observation handling | DONE |
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
| Provision live PostgreSQL database | TODO |
| Persist scored outputs | TODO |
| Expose scored outputs through backend API | TODO |
| Generate heatmap-ready layers | TODO |

## Dependencies

- Existing Earth Engine authentication
- Canonical AOI file at `analytics/data/geometry/karnataka_aoi.geojson`
- Python packages already installed in `analytics/.venv`
- Pandas for DataFrame scoring
- Existing validated DataFrame contract: `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, `Chlorophyll`
- Future live PostgreSQL environment
- Future backend API integration

## Risks

- Scoring thresholds are deterministic academic assumptions and should be calibrated later against advisories, domain feedback, and guide review.
- Missing wave or chlorophyll values can reduce confidence or change score weighting.
- The scoring engine is tested locally but is not yet connected to live PostgreSQL or backend APIs.
- Heatmap visualization will require a separate aggregation/interpolation design and is intentionally not implemented yet.

## Notes

- The current canonical scored output columns are `Latitude`, `Longitude`, `Date`, `SST`, `WindSpeed`, `WaveHeight`, `Chlorophyll`, `PFZScore`, `PFZCategory`, `RiskScore`, `RiskCategory`, `ConfidenceScore`, `ConfidenceLabel`, and `Explanation`.
- The scoring engine receives validated observations only and does not call Earth Engine, SQLAlchemy, Node.js, or React Native.
- Current tests pass with `analytics\.venv\Scripts\python.exe -B -m unittest discover -s analytics\tests -v`.
- Documentation for the extraction framework is available in `docs/DATA_EXTRACTION_FRAMEWORK.md`.
- Documentation for the deterministic analytics model is available in `docs/DATA_ANALYTICS_MODEL.md`.
