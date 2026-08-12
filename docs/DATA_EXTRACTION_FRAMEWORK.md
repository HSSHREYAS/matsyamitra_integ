# MatsyaMitra Data Extraction Framework

**Last updated:** 2026-08-12

## SECTION 1: Overview

MatsyaMitra uses TWO separate extraction systems feeding independent analytics pipelines. They share the same 25 canonical sampling locations but operate independently.

1. **GEE Extraction (Python)**
   - Extracts SST and Chlorophyll from Google Earth Engine
   - Feeds PFZ Analytics
   - Stores in `environmental_observations` → `pfz_results`
   - Triggered manually or via future GEE scheduler (every ~8 hours)

2. **Open-Meteo Extraction (TypeScript)**
   - Extracts Wind Speed and Wave Height from Open-Meteo APIs
   - Feeds Risk Analytics
   - Stores in `marine_observations` → `risk_results`
   - Triggered manually or via future hourly scheduler

They are **INTENTIONALLY SEPARATE** because:
- Different data sources (Google Earth Engine vs Open-Meteo web API)
- Different temporal resolutions (daily/irregular GEE vs hourly Open-Meteo)
- Different languages (Python vs TypeScript)
- Different analytics targets (PFZ vs Risk)
- Independence allows either pipeline to fail or update without affecting the other

## SECTION 2: Canonical Sampling Locations

- **25 fixed Karnataka coastal points:** `KARN_001` through `KARN_025`
- **Defined in:** `analytics/data/geometry/sampling_points.geojson`
- **Database table:** `sampling_locations` (25 active rows)

Both extraction systems use these EXACT coordinates. The canonical coordinates are the authoritative Map/API coordinates. Open-Meteo may respond with grid-cell coordinates that differ slightly; these are stored separately in `source_latitude`/`source_longitude`.

## SECTION 3: Area of Interest

- **Defined in:** `analytics/data/geometry/karnataka_aoi.geojson`
- Karnataka coastal waters, Arabian Sea
- Used for GEE `filterBounds()` queries.

## SECTION 4: GEE Extraction System

### 4a. Purpose
Extract SST and Chlorophyll from Earth Engine datasets.

### 4b. Datasets

**SST: NOAA CDR Optimum Interpolation Sea Surface Temperature (OISST) V2.1**
- GEE collection: `NOAA/CDR/OISST/V2_1`
- Band: `sst`
- Resolution: ~25km
- Typical latency: 1–5 days behind current date
- *Note:* GEE is NOT real-time. Recent imagery may not be available.

**Chlorophyll: Copernicus Global Ocean Colour Bio-Geo-Chemical L4 (4 km)**
- (configured dataset — verify exact collection ID in `analytics/datasets.py`)
- Band: `chlorophyll` (or equivalent band)
- Resolution: ~4km
- Typical latency: may differ from SST latency
- *Note:* SST and Chlorophyll image timestamps are INDEPENDENT.

### 4c. Key Behaviour
- Latest available image within the configured date window is used
- Sort order: `system:time_start DESC`, take `first()`
- SST latest image and Chlorophyll latest image may have different timestamps
- `sst_source_timestamp` and `chlorophyll_source_timestamp` are captured independently
- Date window: configured via `MATSYAMITRA_ANALYSIS_DATE` (override) or dynamic (current date minus window)
- `filterBounds()` applied to Karnataka AOI
- `sampleRegions()` applied to 25 canonical sampling points

### 4d. Implemented Files
- `analytics/extractor.py`
- `analytics/sampler.py`
- `analytics/datasets.py`
- `analytics/geometry.py`
- `analytics/temporal.py`
- `analytics/adapters.py`
- `analytics/pipeline.py`
- `analytics/standardizer.py`
- `analytics/quality.py`
- `analytics/cleaner.py`
- `analytics/validation.py`
- `analytics/schemas.py`
- `analytics/metadata.py`
- `analytics/report.py`
- `analytics/live_gee_pipeline.py`

### 4e. GEE Pipeline Flow
1. Load canonical 25 locations from `sampling_points.geojson`
2. Initialize Earth Engine (`ee.Initialize`)
3. Determine analysis date window
4. Query NOAA OISST: sort by `system:time_start DESC`, select `first()` image
5. Query Copernicus Chlorophyll: independently sort by `system:time_start DESC`, select `first()`
6. Capture `sst_source_timestamp` and `chlorophyll_source_timestamp` separately
7. Apply `filterBounds(karnataka_aoi)`
8. `sampleRegions()` at 25 canonical locations
9. Standardize columns and units
10. Quality assurance (valid range, missing value checks)
11. Insert into `environmental_observations`
12. Score PFZ via `pfz_engine.score_pfz_record()`
13. Insert into `pfz_results` via `PfzRepository`

### 4f. GEE Configuration
- `MATSYAMITRA_GEE_PROJECT` (default: matsyamitra-492811)
- `MATSYAMITRA_ANALYSIS_DATE` (optional; if absent, uses current date)
- `MATSYAMITRA_ANALYSIS_WINDOW_DAYS` (default: 14 days)
- `MATSYAMITRA_SAMPLE_SCALE_METERS`
- `MATSYAMITRA_SAMPLE_LIMIT` (25 for canonical locations)
- `MATSYAMITRA_SAMPLE_SEED`

### 4g. GEE Limitations
- Imagery latency: SST typically 1–5 days behind; Chlorophyll may differ
- `pfz_results` stores `observation_date` (date type only); source timestamp not stored in `pfz_results`—this is a known schema limitation
- GEE is NOT a real-time data source
- Imagery may occasionally be missing for a date window (bad weather, processing delays)
- No automated scheduler yet (triggered manually or future Module 7 scheduler)

## SECTION 5: Open-Meteo Extraction System

### 5a. Purpose
Extract Wind Speed and Wave Height for operational Risk scoring.

### 5b. APIs

**Wind Speed: Open-Meteo Forecast API**
- URL: `https://api.open-meteo.com/v1/forecast`
- Variable: `wind_speed_10m`
- Resolution: hourly

**Wave Height: Open-Meteo Marine API**
- URL: `https://marine-api.open-meteo.com/v1/marine`
- Variable: `wave_height` (or `significant_wave_height`)
- Resolution: hourly

### 5c. Language
TypeScript (Node.js)

### 5d. Implemented Files
- `backend/marine/liveMarineIngestion.ts` (main entry point)
- `backend/marine/ingest.ts`
- `backend/marine/repository.ts`
- `backend/marine/config.ts`
- `backend/marine/types.ts`
- (other `backend/marine/*.ts`)

### 5e. Open-Meteo Pipeline Flow

**TypeScript step:**
1. Load 25 canonical locations from `sampling_points.geojson`
2. Build batched API requests for all 25 locations
3. Fetch `wind_speed_10m` from Forecast API
4. Fetch `wave_height` from Marine API
5. Match observations to canonical location_id (`KARN_xxx`)
6. Store source grid coordinates (`source_latitude`, `source_longitude`) separately from canonical coordinates
7. Insert into `marine_observations` (duplicate policy: skip by default)
8. Print ingestion summary

**Python step (`live_open_meteo_pipeline.py`):**
1. Invoke TypeScript ingestion via subprocess
2. Backfill `sampling_location_id` via `MarineObservationRepository`
3. Fetch latest marine observations
4. Calculate `data_age_hours` from actual `observation_timestamp` (UTC)
5. Build `RiskScoringInput` per location
6. Score via `score_risk_record()`
7. Insert into `risk_results` via `RiskRepository`
8. Print PostgreSQL verification report

### 5f. Coordinate Handling
- Canonical coordinates (from `sampling_points.geojson`) are the authoritative Map/API coordinates
- Open-Meteo may return data for the centre of its nearest grid cell
- Source grid coordinates stored in `marine_observations.source_latitude` / `source_longitude`
- Canonical coordinates are NEVER overwritten by source coordinates

### 5g. Legacy Risk Removal
Prior to Module 5, the TypeScript layer contained its own risk scoring logic. This was **REMOVED** in Module 5. Python is now the sole authoritative Risk analytics engine. `marine_observations` stores only raw observations. Scoring is Python-only.

### 5h. Open-Meteo Limitations
- Grid-cell coordinate mismatch (documented above)
- No automated scheduler yet (Module 7)
- Non-commercial API — rate limits apply
- `data_age_hours` default is 0.0 for unit tests; live pipeline uses actual timestamps

## SECTION 6: Comparison Table

| Aspect | GEE (SST/Chl) | Open-Meteo (Wind/Wave) |
|--------|--------------|------------------------|
| Language | Python | TypeScript + Python |
| Update frequency | Daily / irregular | Hourly |
| Analytics target | PFZ | Risk |
| Result table | `pfz_results` | `risk_results` |
| Scheduler | Not yet (Module 7) | Not yet (Module 7) |
| Real-time | No (1-5 day latency) | Near real-time |
| Canonical locations | Yes (25) | Yes (25) |

## SECTION 7: Previously Documented Phases (Historical Reference)

The following earlier phases remain in the codebase for reference and backward compatibility:
- **Phase 1:** Reusable Earth Engine extraction framework
- **Phase 2:** Multi-dataset environmental integration
- **Phase 3:** Data standardization and quality assurance
- **Phase 4:** SQLAlchemy persistence layer (`environmental_observations`, `analytics_results`)
- **Phase 5:** Deterministic unified scoring engine (`analytics/scoring/engine.py` — now LEGACY for new operations)
- **Phase 6:** End-to-end persistence pipeline

These phases feed the legacy `analytics_results` table. The canonical operational path now uses `pfz_results` and `risk_results`.

## SECTION 8: Testing

- **Python test suite:** 118 tests passing
- **TypeScript:** `npx tsc --noEmit` (no errors)
- **Tests in:** `analytics/tests/`

## SECTION 9: Known Limitations

- [Same list as SYSTEM_ARCHITECTURE.md]
