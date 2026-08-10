# Current Phase: Backend API Integration Preparation

Last updated: 2026-08-10

## Objective

Prepare the validated data and operational marine-risk sources for future REST API and mobile visualization integration.

## Deliverables

- Keep GEE extraction as the source for SST and chlorophyll.
- Keep GEE wind/wave values available for reference and validation.
- Use Open-Meteo wind speed and wave height as the operational MVP risk inputs.
- Store hourly Open-Meteo marine observations in PostgreSQL.
- Preserve canonical sampling locations shared across GEE, Open-Meteo, and future map visualization.

## Current Status

| Area | Status |
| --- | --- |
| Earth Engine API | DONE |
| Authentication | DONE |
| AOI Finalized | DONE |
| Dataset Selection | DONE |
| Canonical Sampling Points | DONE |
| Reusable Framework Modules | DONE |
| Multi-Dataset Extraction Pipeline | DONE |
| Shared Spatial Sampling | DONE |
| Temporal Alignment | DONE |
| Unified Environmental DataFrame | DONE |
| Data Standardization and QA | DONE |
| PostgreSQL Connection | DONE |
| EnvironmentalObservations Table | DONE |
| AnalyticsResults Table | DONE |
| MarineObservations Table | DONE |
| PFZ Score Generation | DONE |
| Risk Score Generation | DONE |
| Confidence Score Generation | DONE |
| Open-Meteo Wind/Wave Ingestion | DONE |
| Operational Risk from Open-Meteo | DONE |
| Live Open-Meteo PostgreSQL Validation | DONE |
| REST API Integration | TODO |
| Heatmap Generation | TODO |
| React Native Visualization Integration | TODO |
| Scheduler | TODO |

## Tasks

| Task | Status |
| --- | --- |
| Formalize `analytics/data/geometry/sampling_points.geojson` | DONE |
| Refactor GEE sampling to reuse canonical sampling points | DONE |
| Add TypeScript Open-Meteo configuration | DONE |
| Implement batched Open-Meteo wave request | DONE |
| Implement batched Open-Meteo wind request | DONE |
| Preserve canonical coordinates and store source grid coordinates separately | DONE |
| Implement `marine_observations` PostgreSQL table | DONE |
| Implement duplicate handling for `location_id + observation_timestamp + source` | DONE |
| Implement marine observation retrieval | DONE |
| Implement operational risk scoring from Open-Meteo wind/wave only | DONE |
| Confirm GEE wind/wave are not used for operational risk | DONE |
| Add focused TypeScript/Jest tests | DONE |
| Run live Open-Meteo ingestion for 25 Karnataka points | DONE |
| Verify live PostgreSQL marine observations | DONE |
| Build REST endpoint for marine observations | TODO |
| Build REST endpoint for operational risk outputs | TODO |
| Connect mobile map to backend data | TODO |
| Implement hourly scheduler | TODO |

## Dependencies

- PostgreSQL database `matsyamitra`
- `MATSYAMITRA_DATABASE_URL`
- Open-Meteo non-commercial APIs
- Canonical sampling points at `analytics/data/geometry/sampling_points.geojson`
- Existing deterministic risk scoring thresholds

## Risks

- Open-Meteo Marine API provides wave variables, while `wind_speed_10m` is retrieved from Open-Meteo Forecast API.
- Open-Meteo source/grid coordinates can differ from canonical MatsyaMitra points and must not replace frontend map coordinates.
- Scheduler is intentionally not implemented yet, so live ingestion must be run manually for now.
- REST API and React Native integration are still pending.

## Notes

- Live validation on 2026-08-10 processed 25 canonical locations.
- PostgreSQL verification showed 25 valid wind values and 25 valid wave values.
- The latest live observation timestamp was 2026-08-10 23:00 IST.
- Focused marine tests passed with `npm run marine:test`.
- TypeScript compilation passed with `npx tsc --noEmit`.
