# MatsyaMitra Project Status
*Last updated: 2026-08-12*

## SECTION 1: Project Purpose
MatsyaMitra is a coastal safety and fishing-zone decision support system for Karnataka's artisanal fishing community. It provides:
- Potential Fishing Zone (PFZ) suitability scores derived from GEE satellite data (SST + Chlorophyll)
- Operational Marine Risk scores derived from Open-Meteo real-time wind and wave data
- A unified current-state read model combining both data streams
The backend is designed to feed a future React Native mobile application with map overlays, risk alerts, and PFZ guidance.

## SECTION 2: Current Architecture Summary (post Modules 1–6)
Two independent pipelines:
1. GEE → SST + Chlorophyll → PFZ Analytics → `pfz_results`
2. Open-Meteo → Wind + Wave → Risk Analytics → `risk_results`
Both anchored to 25 canonical Karnataka sampling locations (KARN_001–KARN_025).
Current-state aggregator (Module 6): reads latest PFZ + Risk per location → unified read model.

## SECTION 3: Completed Modules Summary

| Module | Description | Status |
|--------|-------------|--------|
| Module 1 | Database restructuring (`sampling_locations`, `pfz_results`, `risk_results`, Alembic migration) | COMPLETE |
| Module 2 | Standalone PFZ analytics (SST+Chlorophyll; Wind removed; `pfz_engine.py`; `PfzRepository`) | COMPLETE |
| Module 3 | Standalone Risk analytics (Wind+Wave; SST/Chl removed; `risk_engine.py`; `RiskRepository`) | COMPLETE |
| Module 4 | Canonical GEE sampling (25 fixed points; independent SST/Chl timestamps; dynamic dates) | COMPLETE |
| Module 5 | Open-Meteo hourly Risk integration (TS extracts → DB → Python scores; legacy TS Risk removed) | COMPLETE |
| Module 6 | Current-state aggregation read model (`current_state.py`; READ-ONLY; `FreshnessConfig`) | COMPLETE |

## SECTION 4: Data Sources

| Parameter | Source | API/Dataset | Language |
|-----------|--------|-------------|----------|
| SST | GEE | NOAA CDR OISST V2.1 (`NOAA/CDR/OISST/V2_1`) | Python |
| Chlorophyll | GEE | Copernicus Global Ocean Colour BGC L4 (`COPERNICUS/MARINE/OC_GLO_BGC/PLANKTON_MULTI_4KM`) | Python |
| Wind Speed | Open-Meteo | Forecast API (`wind_speed_10m`) | TypeScript |
| Wave Height | Open-Meteo | Marine API (`wave_height`) | TypeScript |

## SECTION 5: Database Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `sampling_locations` | Canonical 25 Karnataka locations | `id` |
| `environmental_observations` | GEE validated SST/Chl observations | `observation_id` |
| `marine_observations` | Open-Meteo Wind/Wave observations | `marine_observation_id` |
| `pfz_results` | Standalone PFZ analytics outputs | `id` |
| `risk_results` | Standalone Risk analytics outputs | `id` |
| `analytics_results` | LEGACY unified scoring outputs | `analytics_id` |
| `extraction_runs` | GEE pipeline run metadata | `run_id` |
| `dataset_metadata` | Environmental parameter reference | `parameter` |
| `alembic_version` | Schema migration tracking | - |

## SECTION 6: Analytics Architecture

### 6a. PFZ Analytics (`analytics/scoring/pfz_engine.py`)
- **Input:** SST + Chlorophyll ONLY (Wind REMOVED as of Module 2)
- **Normalized weights:** SST=0.4706, Chlorophyll=0.5294
- **Output:** `pfz_score` (0–10), `pfz_category`, `confidence_score` → `pfz_results`
- **Categories:** Highly Favourable / Favourable / Moderate / Low / Very Low / Unknown

### 6b. Risk Analytics (`analytics/scoring/risk_engine.py`)
- **Input:** Wind Speed + Wave Height ONLY (SST/Chlorophyll REMOVED as of Module 3)
- **Normalized weights:** Wind=0.5714, Wave=0.4286
- **Output:** `risk_score` (0–10), `risk_category`, `confidence_score` → `risk_results`
- **Categories:** Safe / Low Risk / Moderate Risk / High Risk / Extreme Risk / Unknown
- **source field:** 'open-meteo' (future: 'incois') — does not affect numeric score

## SECTION 7: Current-State Layer (Module 6)
- **File:** `analytics/current_state.py` (READ-ONLY)
- **Service functions:**
  - `get_current_environmental_state() -> list[CurrentLocationEnvironmentalState]` (25 records)
  - `get_current_environmental_state_for_location(location_id) -> Optional[CurrentLocationEnvironmentalState]`
- **Freshness:** CURRENT/STALE/MISSING status (never alters scores)
- **Thresholds:** PFZ=96h (`MATSYAMITRA_PFZ_STALE_HOURS`), Risk=2h (`MATSYAMITRA_RISK_STALE_HOURS`)
- **PFZ/Risk timestamps:** ALWAYS independent
- **Missing data:** `None` (never fabricated)

## SECTION 8: Testing Status
- **Python:** 118 tests passing (`analytics/.venv/Scripts/python.exe -B -m unittest discover -s analytics\tests -v`)
- **TypeScript:** `npx tsc --noEmit` (no errors)
- **Test coverage includes:** schema, persistence, PFZ scoring, Risk scoring, GEE integration, Open-Meteo integration, temporal aggregation, quality/validation, legacy regression
- **Database:** PostgreSQL (production), SQLite (unit tests only)

## SECTION 9: Live Verification Results (latest)
**Module 5 (last run 2026-08-10):**
- 25 marine observations (wind + wave)
- 25 risk results (score range 4.56–6.75)
- Risk categories: Moderate Risk / High Risk
- Source: open-meteo

**Module 6 (last run 2026-08-12):**
- 25 canonical locations
- 25 PFZ results (STALE — from 2025-06-01 test run)
- 25 Risk results (STALE — from 2026-08-10)
- Timestamps independent: PFZ=2025-06-01, Risk=2026-08-10T23:00
- 0 null/fabricated values

## SECTION 10: Current Limitations
1. **GEE latency:** imagery typically 1–5 days behind current date. GEE is NOT real-time.
2. **PFZ source timestamp:** `pfz_results` stores `observation_date` (date type only). PFZ age uses midnight UTC as conservative floor. Future migration could add `source_timestamp`.
3. **Open-Meteo grid-cell coordinates:** Open-Meteo may return data for grid-cell centroid rather than exact canonical coordinates. Both are preserved in `marine_observations`.
4. **No automated scheduler:** GEE and Open-Meteo pipelines must be triggered manually. Module 7 will implement scheduling.
5. **No seven-day retention:** old records are not automatically purged. Module 7 will implement retention.
6. **INCOIS not integrated:** advisory data from INCOIS is a future module.
7. **Maps/API not implemented:** REST API, Leaflet, and React Native integration are future modules.
8. **Push notifications not implemented.**
9. **User authentication not implemented.**

## SECTION 11: Environment Variables
- **Required:** `MATSYAMITRA_DATABASE_URL`
- **Key optional:** `MATSYAMITRA_ANALYSIS_DATE`, `MATSYAMITRA_GEE_PROJECT`, `MATSYAMITRA_PFZ_STALE_HOURS`, `MATSYAMITRA_RISK_STALE_HOURS`
*(See `DATABASE_INTEGRATION_PIPELINE.md` for full list)*

## SECTION 12: Next Steps — Module 7
- Implement hourly Open-Meteo ingestion scheduler
- Implement 8-hour GEE extraction scheduler
- Implement seven-day data retention / cleanup

## SECTION 13: Future Modules (after 7)
- REST API endpoints (current-state, pfz, risk per location)
- Maps / Leaflet visualization layer
- React Native frontend integration
- Push notifications (marine risk alerts)
- INCOIS integration
- User authentication
- Deployment

## SECTION 14: Legacy Architecture Note
BEFORE Modules 1–6, the system used a unified analytics engine that accepted all four parameters (SST, Chlorophyll, Wind, Wave) and produced combined PFZ+Risk outputs in the `analytics_results` table. This architecture has been replaced by the current separated PFZ/Risk pipelines. The legacy engine (`analytics/scoring/engine.py`) and `analytics_results` table are RETAINED for backward compatibility and regression testing only.
