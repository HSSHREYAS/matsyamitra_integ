# Current Phase: Modules 1–6 Complete — Awaiting Module 7 (Scheduling + Retention)

**Last updated:** 2026-08-12

## Objective
Document the completed engineering baseline after Modules 1–6.

## Completed Engineering Stages
- **Module 1**: Database restructuring (`sampling_locations`, `pfz_results`, `risk_results` tables; Alembic migration 001)
- **Module 2**: Standalone PFZ analytics (SST+Chlorophyll, Wind removed from PFZ; `pfz_engine.py`; `PfzRepository`)
- **Module 3**: Standalone Risk analytics (Wind+Wave, SST/Chlorophyll/PFZ removed from Risk; `risk_engine.py`; `RiskRepository`; `source` field for future INCOIS)
- **Module 4**: Canonical GEE sampling (25 fixed locations from `sampling_points.geojson`; independent SST/Chlorophyll timestamps; dynamic date handling)
- **Module 5**: Open-Meteo hourly Risk integration (TypeScript extracts → `marine_observations` → Python scores → `risk_results`; legacy TS risk scoring removed; real `data_age_hours`)
- **Module 6**: Current-state aggregation read model (`current_state.py`; READ-ONLY; anchored to `sampling_locations`; `FreshnessConfig`; CURRENT/STALE/MISSING status; PFZ age limitation documented)

## Current System State

| Component | Status |
| :--- | :--- |
| GEE SST/Chlorophyll extraction | DONE |
| Canonical 25 sampling locations | DONE |
| PFZ Analytics (SST+Chlorophyll) | DONE |
| PFZ persistence (`pfz_results`) | DONE |
| Open-Meteo Wind/Wave extraction | DONE |
| `marine_observations` persistence | DONE |
| Risk Analytics (Wind+Wave) | DONE |
| Risk persistence (`risk_results`) | DONE |
| Current-state aggregation | DONE |
| Python test suite (118 tests) | DONE |
| TypeScript compilation | DONE |
| Live PostgreSQL verification | DONE |
| Automated scheduler | TODO |
| Seven-day retention | TODO |
| REST API endpoints | TODO |
| Maps / Leaflet integration | TODO |
| React Native visualization | TODO |
| Push notifications | TODO |
| INCOIS integration | TODO |
| User authentication | TODO |

## Next Implementation Stage: Module 7 — Scheduling and Retention
- Implement hourly Open-Meteo scheduler
- Implement 8-hour GEE scheduler
- Implement seven-day data retention/cleanup

## Dependencies
- PostgreSQL database 'matsyamitra'
- `MATSYAMITRA_DATABASE_URL`
- Google Earth Engine API credentials
- Open-Meteo non-commercial APIs
- Canonical sampling points at `analytics/data/geometry/sampling_points.geojson`

## Known Limitations
- GEE latency
- PFZ source timestamp limitation
- Open-Meteo grid-cell coordinates
- No automated scheduler
- No retention
- Maps/API/notifications not yet implemented
