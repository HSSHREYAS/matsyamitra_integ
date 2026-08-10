# Open-Meteo Operational Marine Integration

Last updated: 2026-08-10

## Purpose

This phase adds Open-Meteo as the operational wind and wave source for MVP risk-zone analytics.

It does not change the PFZ scoring formula, the GEE extraction framework, React Native UI, maps, heatmaps, INCOIS ingestion, currents, swell, wave period, wave direction, or scheduling.

## Operational Decision

PFZ inputs:

- SST from GEE
- Chlorophyll from GEE

Reference-only environmental values:

- GEE wind speed
- GEE wave height

Operational MVP risk inputs:

- Open-Meteo wind speed
- Open-Meteo wave height

The risk model remains:

```text
Risk = Wind Speed + Significant Wave Height
```

## Canonical Sampling Points

Canonical sampling points are stored at:

```text
analytics/data/geometry/sampling_points.geojson
```

The file contains 25 stable WGS84 points:

```text
KARN_001 ... KARN_025
```

These points are reused by:

- GEE extraction
- Open-Meteo ingestion
- Future frontend map layers

Open-Meteo returned grid coordinates are stored separately and must not replace canonical map coordinates.

## Implemented TypeScript Modules

```text
backend/marine/
  config.ts
  samplingPoints.ts
  openMeteoClient.ts
  repository.ts
  risk.ts
  ingest.ts
  liveMarineIngestion.ts
  index.ts
```

## API Sources

Open-Meteo Marine API:

```text
https://marine-api.open-meteo.com/v1/marine
```

Used for:

```text
wave_height
```

Open-Meteo Forecast API:

```text
https://api.open-meteo.com/v1/forecast
```

Used for:

```text
wind_speed_10m
```

Reason:

The current Open-Meteo Marine API provides wave variables, but the live API does not return `wind_speed_10m`. The implementation therefore uses Open-Meteo Marine for wave height and Open-Meteo Forecast for wind speed while keeping both values under the Open-Meteo operational source.

## Database Table

Table:

```text
marine_observations
```

Fields:

```text
marine_observation_id
location_id
latitude
longitude
observation_timestamp
wind_speed
wave_height
source
source_latitude
source_longitude
source_metadata
created_at
```

Duplicate key:

```text
location_id + observation_timestamp + source
```

Supported duplicate policies:

- `skip`
- `replace`
- `update`

## Commands

Run focused tests:

```powershell
npm run marine:test
```

Run live ingestion:

```powershell
$env:MATSYAMITRA_DATABASE_URL="postgresql+psycopg2://postgres:admin@localhost:5432/matsyamitra"
$env:MATSYAMITRA_DUPLICATE_POLICY="update"
npm run marine:live
```

## Live Validation

Live validation completed on 2026-08-10.

Result:

```text
Requested locations: 25
Parsed observations: 25
Inserted: 0
Skipped: 0
Updated: 25
Replaced: 0
Warnings: None
```

PostgreSQL verification:

```text
Total Open-Meteo marine rows: 25
Valid wind speed values: 25
Missing wind speed values: 0
Valid wave height values: 25
Missing wave height values: 0
Observation timestamp: 2026-08-10 23:00 IST
```

Sample record:

```text
location_id: KARN_001
canonical latitude: 14.602642
canonical longitude: 73.152614
source latitude: 14.625
source longitude: 73.125015
wind_speed: 7.82 m/s
wave_height: 2.76 m
risk_score: 6.41
risk_category: High Risk
```

## Current Limitations

- Scheduler is not implemented.
- REST APIs are not implemented.
- React Native visualization is not connected to this table yet.
- Heatmaps are not implemented.
- Source metadata stores both marine and wind API grid details, but only marine grid coordinates are promoted to top-level `source_latitude` and `source_longitude`.
