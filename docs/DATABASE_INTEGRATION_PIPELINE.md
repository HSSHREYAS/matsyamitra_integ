# MatsyaMitra Database Integration Pipeline

Last updated: 2026-08-01

## Purpose

This document explains Phase 6 of the MatsyaMitra Earth Observation Pipeline.

Phase 6 does not create a new analytics model. It connects the already implemented Earth Engine extraction framework, quality assurance layer, SQLAlchemy persistence layer, and deterministic analytics engine into one operational backend pipeline.

## High-Level Flow

```text
Google Earth Engine
        |
Extraction Framework
        |
Quality Assurance and Standardization
        |
EnvironmentalObservations Table
        |
Deterministic Analytics Engine
        |
AnalyticsResults Table
        |
Execution Summary
```

The analytics engine never communicates directly with Google Earth Engine. It receives only validated environmental observations.

## Implemented Files

```text
run_pipeline.py

analytics/
  end_to_end_pipeline.py
  persistence/
    models.py
    repository.py
    database.py
    session.py
  tests/
    test_end_to_end_pipeline.py
```

## Pipeline Entry Point

The operational command is:

```powershell
python run_pipeline.py
```

This performs:

```text
Earth Engine initialization
        |
Environmental extraction
        |
QA and standardization
        |
Store factual observations
        |
Run deterministic analytics
        |
Store analytics results
        |
Print execution summary
```

## Database Tables

### EnvironmentalObservations

Purpose:

Store validated factual environmental observations after extraction, standardization, and quality assurance.

This table is the source of truth for environmental data.

Implemented fields:

```text
observation_id
latitude
longitude
observation_date
sst
wind_speed
wave_height
chlorophyll
created_at
updated_at
run_id
```

Important rule:

No PFZ, risk, confidence, or explanation fields belong in this table.

### AnalyticsResults

Purpose:

Store deterministic analytics outputs generated from rows in `environmental_observations`.

Implemented fields:

```text
analytics_id
observation_id
pfz_score
pfz_category
risk_score
risk_category
confidence_score
confidence_label
explanation
analytics_version
created_at
```

Important rule:

This table does not duplicate SST, wind speed, wave height, or chlorophyll. It references one factual environmental observation through `observation_id`.

### ExtractionRuns

Purpose:

Track each pipeline run.

Used for:

- requested date window
- sample count
- retained count
- missing summary
- execution time
- status
- warnings

### DatasetMetadata

Purpose:

Store metadata describing environmental parameters and their datasets.

## Transaction Behavior

The database stages run inside one transaction.

If observation insertion fails:

```text
Rollback observations
Rollback analytics results
```

If analytics generation fails:

```text
Rollback observations
Rollback analytics results
```

If analytics-result insertion fails:

```text
Rollback observations
Rollback analytics results
```

This prevents partially updated database state.

## Duplicate Policy

Duplicate environmental observations are detected using:

```text
latitude + longitude + observation_date
```

Supported pipeline duplicate policies:

| Policy | Behavior |
| --- | --- |
| `skip` | Keep the existing observation and do not regenerate analytics for it. |
| `replace` | Delete the existing observation and analytics results, then insert a fresh observation and fresh analytics. |
| `update` | Update the existing observation values and regenerate analytics for that observation. |

The policy is configured through:

```text
MATSYAMITRA_DUPLICATE_POLICY
```

Default:

```text
skip
```

## Analytics Versioning

Every analytics result stores an analytics version.

Environment variable:

```text
MATSYAMITRA_ANALYTICS_VERSION
```

Default:

```text
deterministic-v1
```

This lets future versions of the deterministic scoring model coexist or be regenerated cleanly.

## Execution Summary

The pipeline returns and prints a structured summary containing:

```text
Extraction Complete
Raw Observations
Observations Retained
Observations Inserted
Observations Skipped
Observations Updated
Observations Replaced
Analytics Generated
Analytics Stored
Execution Time
Warnings
Errors
```

## Environment Variables

Required for live database execution:

```text
MATSYAMITRA_DATABASE_URL
```

Optional:

```text
MATSYAMITRA_DATABASE_ECHO
MATSYAMITRA_DATABASE_POOL_PRE_PING
MATSYAMITRA_DATABASE_SCHEMA_VERSION
MATSYAMITRA_OBSERVATIONS_TABLE
MATSYAMITRA_RUNS_TABLE
MATSYAMITRA_METADATA_TABLE
MATSYAMITRA_ANALYTICS_RESULTS_TABLE
MATSYAMITRA_DUPLICATE_POLICY
MATSYAMITRA_ANALYTICS_VERSION
MATSYAMITRA_ANALYSIS_DATE
MATSYAMITRA_ANALYSIS_WINDOW_DAYS
MATSYAMITRA_START_DATE
MATSYAMITRA_END_DATE
MATSYAMITRA_SAMPLE_SCALE_METERS
MATSYAMITRA_SAMPLE_LIMIT
MATSYAMITRA_SAMPLE_SEED
MATSYAMITRA_TILE_SCALE
MATSYAMITRA_GEE_PROJECT
```

## Validation

Current local test command:

```powershell
analytics\.venv\Scripts\python.exe -B -m unittest discover -s analytics\tests -v
```

Current result:

```text
32 tests passed
```

Phase 6 tests verify:

- Observations are inserted.
- Analytics results are stored.
- Analytics results reference environmental observations.
- Duplicate `skip` policy avoids duplicate inserts.
- Duplicate `update` policy refreshes observations and analytics.
- Analytics failure rolls back inserted observations and analytics results.

## Current Limitations

- Unit tests use SQLite for fast local validation.
- Live PostgreSQL validation is still pending.
- REST API integration is not implemented yet.
- Heatmap generation is not implemented yet.
- Scheduling and automation are not implemented yet.
- React Native still displays mock data until backend API integration is added.
