import sys
from datetime import date, datetime, timezone
from time import perf_counter
from typing import Any

import ee
import pandas as pd

from analytics.config import (
    DEFAULT_DATE_RANGE,
    DEFAULT_SAMPLING_CONFIG,
    EARTH_ENGINE_PROJECT_ID,
)
from analytics.pipeline import run_environmental_pipeline
from analytics.persistence.database import create_database_engine, create_tables
from analytics.persistence.ingest import validate_persistence_schema
from analytics.persistence.repository import EnvironmentalObservationRepository, PfzRepository
from analytics.persistence.session import create_session_factory, session_scope
from analytics.report import run_quality_assurance_pipeline
from analytics.scoring.models import PfzScoringInput
from analytics.scoring.pfz_engine import score_pfz_record

_UTC = timezone.utc

def run_live_gee_pfz_pipeline(engine: Any = None) -> dict[str, Any]:
    started_at = perf_counter()
    ee.Initialize(project=EARTH_ENGINE_PROJECT_ID)

    # 1. Run extraction (which now strictly uses Canonical Sampler and fetches latest images + timestamps)
    print("Running extraction...")
    extraction = run_environmental_pipeline(
        dataset_keys=("sst_noaa_oisst", "chlorophyll_copernicus_global_ocean_colour"),
        date_range=DEFAULT_DATE_RANGE,
        sampling=DEFAULT_SAMPLING_CONFIG,
    )
    df = extraction.dataframe
    
    # 2. QA and validation
    print("Running QA...")
    quality = run_quality_assurance_pipeline(df)
    clean_df = quality.clean_dataframe
    
    # QA pipeline strips non-standard columns, restore location_id for mapping
    if "location_id" in df.columns and "location_id" not in clean_df.columns:
        loc_df = df[["Latitude", "Longitude", "location_id"]].drop_duplicates()
        clean_df = clean_df.merge(loc_df, on=["Latitude", "Longitude"], how="left")
        
    validate_persistence_schema(clean_df)

    # 3. Persistence
    print("Persisting Environmental Observations...")
    db_engine = engine or create_database_engine()
    create_tables(db_engine)
    session_factory = create_session_factory(db_engine)
    
    now = datetime.now(tz=_UTC)

    results = []

    with session_scope(session_factory) as session:
        env_repo = EnvironmentalObservationRepository(session)
        pfz_repo = PfzRepository(session)

        env_repo.upsert_dataset_metadata(last_verified=date.today())
        
        run = env_repo.create_extraction_run(
            requested_start_date=date.fromisoformat(DEFAULT_DATE_RANGE.start),
            requested_end_date=date.fromisoformat(DEFAULT_DATE_RANGE.end),
            sample_count=len(df),
            retained_count=len(clean_df),
            missing_summary=quality.summary["parameter_quality"],
            execution_time=extraction.execution_time_seconds,
            status="success",
            warnings=[],
        )

        observation_outcome = env_repo.insert_observations_with_policy(
            clean_df,
            run.run_id,
            duplicate_policy="replace",
        )
        
        # Mapping back location_id from the RAW extraction Dataframe to get source timestamps
        # because the QA pipeline strips out unrecognized columns.
        raw_records = df.to_dict(orient="records")
        
        print("Scoring and persisting PFZ...")
        pfz_inserted = 0

        for obs in observation_outcome.observations_for_analytics:
            # We must skip if we couldn't resolve the canonical location
            if obs.sampling_location_id is None:
                continue
                
            matched_row = next((r for r in raw_records if abs(r["Latitude"] - obs.latitude) < 0.001 and abs(r["Longitude"] - obs.longitude) < 0.001), None)
            
            sst_age_hours = None
            chl_age_hours = None
            
            if matched_row:
                sst_ts = matched_row.get("SST_Timestamp")
                if pd.notna(sst_ts):
                    sst_dt = datetime.fromtimestamp(sst_ts / 1000.0, tz=_UTC)
                    sst_age_hours = (now - sst_dt).total_seconds() / 3600.0

                chl_ts = matched_row.get("Chlorophyll_Timestamp")
                if pd.notna(chl_ts):
                    chl_dt = datetime.fromtimestamp(chl_ts / 1000.0, tz=_UTC)
                    chl_age_hours = (now - chl_dt).total_seconds() / 3600.0

            pfz_input = PfzScoringInput(
                sampling_location_id=obs.sampling_location_id,
                observation_date=obs.observation_date,
                sst=obs.sst,
                chlorophyll=obs.chlorophyll,
                environmental_observation_id=obs.id,
                sst_data_age_hours=sst_age_hours,
                chlorophyll_data_age_hours=chl_age_hours,
            )
            
            scored = score_pfz_record(pfz_input)
            inserted = pfz_repo.insert_pfz_result(scored)
            pfz_inserted += inserted
            
            results.append({
                "location_id": matched_row.get("location_id") if matched_row else "Unknown",
                "latitude": obs.latitude,
                "longitude": obs.longitude,
                "sst": obs.sst,
                "chlorophyll": obs.chlorophyll,
                "sst_age_hours": sst_age_hours,
                "chl_age_hours": chl_age_hours,
                "pfz_score": scored.pfz_score,
                "pfz_category": scored.pfz_category,
                "confidence_score": scored.confidence_score,
            })
            
        latest_pfz = pfz_repo.get_latest_pfz_results()

    return {
        "execution_time_seconds": perf_counter() - started_at,
        "canonical_locations_processed": len(clean_df),
        "environmental_inserted": observation_outcome.inserted_count,
        "pfz_inserted": pfz_inserted,
        "results": results,
        "latest_pfz_count": len(latest_pfz),
    }

if __name__ == "__main__":
    report = run_live_gee_pfz_pipeline()
    
    results = report["results"]
    
    # A. Number of canonical locations
    print(f"\nA. Number of canonical locations: {report['canonical_locations_processed']}")
    
    # B. SST Stats
    sst_valid = [r for r in results if r["sst"] is not None]
    sst_ages = [r["sst_age_hours"] for r in sst_valid if r["sst_age_hours"] is not None]
    print("B. SST:")
    print(f"   - valid count: {len(sst_valid)}")
    print(f"   - missing count: {len(results) - len(sst_valid)}")
    if sst_ages:
        print(f"   - age range: {min(sst_ages):.1f}h - {max(sst_ages):.1f}h")
    
    # C. Chlorophyll Stats
    chl_valid = [r for r in results if r["chlorophyll"] is not None]
    chl_ages = [r["chl_age_hours"] for r in chl_valid if r["chl_age_hours"] is not None]
    print("C. Chlorophyll:")
    print(f"   - valid count: {len(chl_valid)}")
    print(f"   - missing count: {len(results) - len(chl_valid)}")
    if chl_ages:
        print(f"   - age range: {min(chl_ages):.1f}h - {max(chl_ages):.1f}h")
        
    print(f"\nD. Environmental observations inserted: {report['environmental_inserted']}")
    print(f"E. PFZ results inserted: {report['pfz_inserted']}")
    
    # F. PFZ results by category
    categories = {}
    pfz_scores = []
    conf_scores = []
    for r in results:
        cat = r["pfz_category"]
        categories[cat] = categories.get(cat, 0) + 1
        if r["pfz_score"] is not None:
            pfz_scores.append(r["pfz_score"])
        conf_scores.append(r["confidence_score"])
        
    print("\nF. PFZ results by category:")
    for cat, count in categories.items():
        print(f"   - {cat}: {count}")
        
    # G, H
    print("\nG. PFZ score min/max:")
    if pfz_scores:
        print(f"   - min: {min(pfz_scores):.1f}  max: {max(pfz_scores):.1f}")
    
    print("\nH. PFZ confidence min/max:")
    if conf_scores:
        print(f"   - min: {min(conf_scores):.1f}%  max: {max(conf_scores):.1f}%")
        
    # I. Number of locations with no current PFZ result (25 - inserted)
    no_result_count = 25 - report["pfz_inserted"]
    print(f"\nI. Number of locations with no current PFZ result: {no_result_count}")
    
    print("\nJ. Example records:")
    for r in results[:3]:  # Print first 3
        print(f"   Location: {r['location_id']}")
        print(f"   Lat: {r['latitude']:.4f}, Lon: {r['longitude']:.4f}")
        print(f"   SST: {r['sst']} (age: {r['sst_age_hours']})")
        print(f"   Chl: {r['chlorophyll']} (age: {r['chl_age_hours']})")
        print(f"   PFZ: {r['pfz_score']} ({r['pfz_category']}) - Conf: {r['confidence_score']}%")
        print("   " + "-"*40)

    print(f"\nExecution time: {report['execution_time_seconds']:.2f}s")

