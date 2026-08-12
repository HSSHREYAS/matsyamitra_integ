# MatsyaMitra System Architecture

*Last updated: 2026-08-12*

## Table of Contents
1. [Project Purpose](#project-purpose)
2. [Data Flow and Pipelines](#data-flow-and-pipelines)
3. [Canonical Locations](#canonical-locations)
4. [Database Architecture](#database-architecture)
5. [Architectural Decision: PFZ vs Risk Separation](#architectural-decision-pfz-vs-risk-separation)
6. [Module Summaries (1-6)](#module-summaries-1-6)
7. [Freshness and Status Model](#freshness-and-status-model)
8. [PFZ Age Limitation](#pfz-age-limitation)
9. [Technology Stack](#technology-stack)
10. [Testing](#testing)
11. [Current Limitations](#current-limitations)
12. [Future Planned Work](#future-planned-work)

## Project Purpose
MatsyaMitra is a comprehensive safety and fishing advisory application designed for coastal fishermen in Karnataka. It provides Potential Fishing Zone (PFZ) insights alongside marine safety risk assessments. The system aggregates satellite imagery for sea surface temperature and chlorophyll-a concentrations, combining this with marine weather forecasts (wind and wave data) to deliver actionable insights that promote both prosperous and safe fishing operations.

## Data Flow and Pipelines

The MatsyaMitra backend operates two independent data pipelines that extract, process, and analyze data before combining them into a unified current state view.

```text
                       [sampling_points.geojson]
                                 |
                                 v
                      (25 Canonical Locations)
                                 |
          +----------------------+----------------------+
          |                                             |
   (GEE Pipeline)                             (Open-Meteo Pipeline)
          v                                             v
  [Google Earth Engine]                            [Open-Meteo API]
(NOAA SST + Cop. Chloro)                          (Wind + Wave Data)
          |                                             |
          v                                             v
[environmental_observations]                  [marine_observations]
          |                                             |
          v                                             v
   [PFZ Analytics]                               [Risk Analytics]
 (SST + Chlorophyll)                              (Wind + Wave)
          |                                             |
          v                                             v
    [pfz_results]                                [risk_results]
          |                                             |
          +----------------------+----------------------+
                                 |
                                 v
                        [current_state.py]
                                 |
                                 v
              [CurrentLocationEnvironmentalState]
```

### 1. GEE Branch
- **Source:** `sampling_points.geojson`
- **Extraction:** Google Earth Engine pulls NOAA OISST (Sea Surface Temperature) and Copernicus (Chlorophyll) data.
- **Raw Storage:** Environmental values are stored in `environmental_observations`.
- **Analytics:** PFZ Analytics processes SST and Chlorophyll.
- **Output:** Stored in `pfz_results`.

### 2. Open-Meteo Branch
- **Source:** `sampling_locations` table
- **Extraction:** TypeScript Open-Meteo script ingests wind and wave data.
- **Raw Storage:** Saved into `marine_observations`.
- **Analytics:** Python `RiskScoringInput` drives the Risk Analytics (Wind + Wave only).
- **Output:** Stored in `risk_results`.

### 3. Current-State Aggregation
- **Process:** The `current_state.py` module aggregates canonical `sampling_locations` with the latest `pfz_results` and `risk_results`.
- **Output:** Produces `CurrentLocationEnvironmentalState` for future consumption by APIs and Maps.

## Canonical Locations
The system targets 25 canonical locations within the Karnataka coastal waters, identified as `KARN_001` through `KARN_025`.
These locations are structurally defined in `sampling_points.geojson` and are rigorously used by both the GEE and Open-Meteo pipelines to guarantee geographical alignment across all environmental and marine observations.

## Database Architecture
PostgreSQL serves as the production database. The schema is defined via SQLAlchemy ORM and managed through Alembic migrations.

- **`sampling_locations`**: Stores the 25 canonical locations.
- **`environmental_observations`**: Stores raw/validated GEE observations. Includes a nullable `sampling_location_id`.
- **`marine_observations`**: Stores Open-Meteo wind and wave data. (The `location_id` maps back to `sampling_location_id` via backfilling).
- **`pfz_results`**: Standalone outputs for Potential Fishing Zones. Keyed by `sampling_location_id` + `observation_date` + `analytics_version`.
- **`risk_results`**: Standalone outputs for Marine Risk. Keyed by `sampling_location_id` + `observation_timestamp` + `analytics_version`.
- **`analytics_results`**: LEGACY table representing older unified scoring. Retained strictly for backward compatibility.
- **`extraction_runs`**: Stores metadata pertaining to GEE pipeline execution runs.
- **`dataset_metadata`**: Reference table for parameters and datasets.

## Architectural Decision: PFZ vs Risk Separation
PFZ and Risk metrics are intentionally segregated into separate tables (`pfz_results` and `risk_results`).
**Reasoning:** They operate on fundamentally different temporal resolutions. 
- **PFZ** data derived from GEE is daily or irregular, bound to an observation date.
- **Risk** data from Open-Meteo operates on precise hourly intervals.
Attempting to combine these into a single table would necessitate fabricating timestamps and introducing severe architectural coupling, diminishing data integrity.

## Module Summaries (1-6)

### Module 1: Database Restructuring
Overhauled the database schema. Introduced `sampling_locations`, `pfz_results`, and `risk_results` tables. Generated corresponding Alembic migrations.

### Module 2: Standalone PFZ Analytics
Decoupled PFZ scoring. Removed wind processing from PFZ. Created the new `pfz_engine.py` scoring engine utilizing SST and Chlorophyll only. Implemented `PfzRepository`. 
- **Normalized Weights:** SST = 0.4706, Chlorophyll = 0.5294.

### Module 3: Standalone Risk Analytics
Decoupled Risk scoring. Removed SST/Chlorophyll processing from Risk. Built `risk_engine.py` dealing exclusively with Wind and Wave data. Implemented `RiskRepository`. Introduced a `source` field for future INCOIS integration.
- **Normalized Weights:** Wind = 0.5714, Wave = 0.4286.

### Module 4: Canonical GEE Sampling
Shifted from randomized GEE geographic sampling to precise 25 fixed canonical locations defined in `sampling_points.geojson`. Enabled independent source timestamps for SST and Chlorophyll. Enabled dynamic target date configuration via the `MATSYAMITRA_ANALYSIS_DATE` environment variable.

### Module 5: Open-Meteo → Risk Live Integration
Constructed a TypeScript pipeline for Open-Meteo extraction targeting wind/wave data, saving to `marine_observations`. Implemented Python `live_open_meteo_pipeline.py` to backfill `sampling_location_id`, calculate real-time `data_age_hours`, execute risk scoring, and persist to `risk_results`. Stripped legacy TypeScript risk scoring.

### Module 6: Current-State Aggregation
Implemented a strict **read-only** current state aggregation via `current_state.py`. Anchored the state to `sampling_locations`. Designed `CurrentLocationEnvironmentalState` with optional `PfzState` and `RiskState`. Configured strict freshness rules (`FreshnessConfig`) with PFZ thresholds at 96 hours and Risk thresholds at 2 hours, customizable via environment variables.

## Freshness and Status Model
State generation defines data freshness using the following categories:
- **CURRENT**
- **STALE**
- **MISSING**

These states are **metadata only**. The state categorization never alters the underlying mathematical scores or statistical confidence levels generated by the engines.

## PFZ Age Limitation
Currently, the `pfz_results` table tracks `observation_date` (as a standard `date` type), but it does not store precise source timestamps for the individual parameters. Because of this, calculating PFZ age involves referencing midnight UTC of the `observation_date`. This acts as a highly conservative floor constraint for age calculations. A future schema migration may introduce an exact `source_timestamp` field to refine this calculation.

## Technology Stack
- **Data Analytics / Processing:** Python
- **Data Extraction (Open-Meteo):** TypeScript
- **Database ORM:** SQLAlchemy
- **Database Migrations:** Alembic
- **Production Database:** PostgreSQL
- **Unit Testing Database:** SQLite
- **External APIs:** Google Earth Engine Python API, Open-Meteo Marine/Forecast APIs.

## Testing
- **Python:** 118 Unit/Integration tests passing successfully (Valid as of Module 6).
- **TypeScript:** The Open-Meteo ingestion scripts compile cleanly without errors using `npx tsc --noEmit`.

## Current Limitations
- **GEE Imagery Latency:** Satellite imagery can frequently lag several days behind the current date.
- **PFZ Source Timestamps:** Precise observation timestamps are absent (`observation_date` is utilized).
- **Open-Meteo Grid Shifts:** Noticeable grid-cell coordinate shifts from canonical locations.
- **Automation:** No automated scheduler/cron exists for seamless operations.
- **Data Pruning:** No seven-day retention/cleanup policy implemented yet.
- **External Integrations:** INCOIS data streams are not currently integrated.
- **Frontend/API:** REST API endpoints, Leaflet map integration, and React Native frontend remain unimplemented.
- **User Engagement:** Push notifications and user authentication are not present.

## Future Planned Work
- **Module 7:** Introduction of a scheduling system and automated seven-day data retention cleanup.
- **Backend API:** Development of robust REST API endpoints.
- **Mapping:** Integration with maps (Leaflet).
- **Frontend Integration:** Full integration into the React Native mobile client.
- **User Engagement:** Implementation of Push notifications and User Accounts.
- **Data Partnerships:** INCOIS advisory integrations.
