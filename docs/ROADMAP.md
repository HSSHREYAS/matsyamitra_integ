# MatsyaMitra Roadmap

**Last updated:** 2026-08-12

## COMPLETED

### Foundation
- React Native App (initial)
- Google Maps integration
- Google Earth Engine registration
- Google Cloud Project setup
- Earth Engine Python API setup
- Earth Engine authentication
- AOI finalization (`karnataka_aoi.geojson`)
- Dataset finalization (NOAA OISST SST, Copernicus Chlorophyll)
- Earth Engine extraction framework
- Multi-dataset environmental extraction
- Unified environmental DataFrame
- Environmental data standardization
- Quality assurance pipeline
- SQLAlchemy persistence layer
- Repository query layer
- End-to-end environmental persistence pipeline
- One-command pipeline entry point
- Live PostgreSQL provisioning
- Canonical 25 sampling points (KARN_001–KARN_025, `sampling_points.geojson`)
- Open-Meteo Wind/Wave integration (TypeScript)

### Module 1 — Database Restructuring
- `sampling_locations` table (25 canonical Karnataka locations)
- `pfz_results` table (standalone PFZ persistence)
- `risk_results` table (standalone Risk persistence)
- Alembic migration 001
- Backfill of `sampling_location_id` on `environmental_observations`

### Module 2 — PFZ Analytics
- Standalone PFZ scoring (SST + Chlorophyll only — Wind removed)
- Normalized PFZ weights (SST=0.4706, Chlorophyll=0.5294)
- `pfz_engine.py`
- `PfzScoringInput` / `PfzScoredResult` models
- `PfzRepository` (insert + `get_latest` per location)
- PFZ confidence and freshness handling
- PFZ unit tests

### Module 3 — Risk Analytics
- Standalone Risk scoring (Wind + Wave only — SST/Chlorophyll removed)
- Normalized Risk weights (Wind=0.5714, Wave=0.4286)
- `risk_engine.py` / `score_risk_record()`
- `RiskScoringInput` / `RiskScoredResult` models (with source field for future INCOIS)
- `RiskRepository` (insert + `get_latest` per location)
- Risk confidence and freshness handling
- Risk unit tests

### Module 4 — GEE/PFZ Live Integration
- Canonical GEE sampling (25 fixed locations from `sampling_points.geojson`)
- Independent SST and Chlorophyll source timestamp capture
- Dynamic operational date handling (`MATSYAMITRA_ANALYSIS_DATE`)
- GEE → `environmental_observations` → `pfz_results` pipeline
- `live_gee_pipeline.py`
- GEE/PFZ integration tests

### Module 5 — Open-Meteo Hourly Risk Integration
- TypeScript Open-Meteo extraction → `marine_observations`
- `sampling_location_id` backfill (`MarineObservationRepository`)
- Python `live_open_meteo_pipeline.py` coordinator
- Real `data_age_hours` from actual observation timestamps
- `risk_results` persistence
- Legacy TypeScript risk scoring removed
- Open-Meteo integration tests

### Module 6 — Current-State Aggregation
- `analytics/current_state.py` (READ-ONLY service)
- `CurrentLocationEnvironmentalState` / `PfzState` / `RiskState` dataclasses
- `get_current_environmental_state()` — 25 locations
- `get_current_environmental_state_for_location()`
- `FreshnessConfig` (PFZ=96h, Risk=2h, configurable via env vars)
- CURRENT / STALE / MISSING status model
- Current-state unit tests (18 tests)
- Live PostgreSQL read-only verification
- Total Python test suite: 118 tests passing

---

## CURRENT
- Documentation update (post Modules 1–6)

---

## NEXT — Module 7
- Hourly Open-Meteo scheduler
- 8-hour GEE scheduler
- Seven-day data retention / cleanup scheduler

---

## FUTURE (after Module 7)
- Backend REST API endpoints (current-state, pfz, risk)
- Maps / Leaflet visualization layer
- React Native map integration
- Push notifications (marine risk alerts)
- INCOIS advisory integration
- User authentication / personal data
- PostGIS spatial extensions (if needed)
- ML calibration of thresholds using domain expert feedback
- Deployment / hosting
