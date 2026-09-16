"""Live verification script for MatsyaMitra REST API.

Tests:
1. GET /api/v1/health
2. GET /api/v1/current-state
3. GET /api/v1/current-state/KARN_001
4. GET /api/v1/advisories
5. GET /api/v1/alerts
"""

import json
import os
import sys
import time
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.abspath("."))

import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

# Setup in-memory / local test database for verification
from analytics.persistence.models import (
    Base,
    IncoisAdvisory,
    PfzResult,
    RiskResult,
    SamplingLocation,
)

def setup_test_data(db_url: str):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        # Check if already seeded
        existing = session.query(SamplingLocation).first()
        if not existing:
            print("Seeding 25 canonical locations and sample telemetry...")
            for i in range(1, 26):
                loc_code = f"KARN_{i:03d}"
                lat = 12.8 + (i * 0.08)
                lon = 74.7 - (i * 0.03)
                loc = SamplingLocation(
                    location_id=loc_code,
                    latitude=lat,
                    longitude=lon,
                    is_active=True,
                )
                session.add(loc)
                session.flush()

                # Seed PFZ result
                pfz = PfzResult(
                    sampling_location_id=loc.id,
                    observation_date=date.today(),
                    source="gee",
                    sst=28.4 + (i * 0.05),
                    chlorophyll=0.35 + (i * 0.02),
                    pfz_score=round(7.5 + (i % 3) * 0.7, 2),
                    pfz_category="Highly Favourable" if i % 2 == 0 else "Favourable",
                    confidence_score=0.91,
                    analytics_version="deterministic-v1",
                )
                session.add(pfz)

                # Seed Risk result
                risk_cat = "High Risk" if i == 1 else "Moderate Risk" if i == 2 else "Safe"
                risk_score = 7.9 if i == 1 else 5.2 if i == 2 else 2.1
                risk = RiskResult(
                    sampling_location_id=loc.id,
                    observation_timestamp=datetime.now(timezone.utc),
                    source="open-meteo",
                    wind_speed=26.0 if i == 1 else 14.0,
                    wave_height=3.4 if i == 1 else 1.8,
                    risk_score=risk_score,
                    risk_category=risk_cat,
                    confidence_score=0.94,
                    analytics_version="deterministic-v1",
                )
                session.add(risk)

            # Seed INCOIS advisories
            session.add(
                IncoisAdvisory(
                    advisory_date=date.today(),
                    sector_id="KARNATAKA",
                    landing_center="Mangalore Fishing Harbour",
                    bearing_degrees=240.0,
                    distance_km=16.0,
                    depth_m=32.0,
                    latitude=12.92,
                    longitude=74.72,
                    raw_text="Sample advisory Mangalore",
                    scraped_at=datetime.now(timezone.utc),
                    nearest_sampling_location_id=1,
                    distance_to_nearest_km=3.5,
                )
            )
            session.add(
                IncoisAdvisory(
                    advisory_date=date.today(),
                    sector_id="KARNATAKA",
                    landing_center="Malpe Fishing Harbour",
                    bearing_degrees=270.0,
                    distance_km=22.0,
                    depth_m=45.0,
                    latitude=13.36,
                    longitude=74.62,
                    raw_text="Sample advisory Malpe",
                    scraped_at=datetime.now(timezone.utc),
                    nearest_sampling_location_id=2,
                    distance_to_nearest_km=5.1,
                )
            )
            session.commit()
            print("Seeding complete.")


def run_verification(base_url: str):
    print(f"\n==================================================")
    print(f"VERIFYING MATSYAMITRA REST API AT: {base_url}")
    print(f"==================================================")

    endpoints = [
        ("GET", "/api/v1/health", {}),
        ("GET", "/api/v1/current-state", {}),
        ("GET", "/api/v1/current-state/KARN_001", {}),
        ("GET", "/api/v1/advisories", {}),
        ("GET", "/api/v1/alerts", {}),
    ]

    for method, path, params in endpoints:
        url = f"{base_url}{path}"
        print(f"\n--- [TEST] {method} {path} ---")
        try:
            resp = requests.get(url, params=params, timeout=5)
            print(f"Status Code: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    print(f"Items Returned: {len(data)}")
                    print(f"Sample Item:\n{json.dumps(data[0] if len(data) > 0 else {}, indent=2)}")
                else:
                    print(f"Response Body:\n{json.dumps(data, indent=2)}")
                print("Result: PASS")
            else:
                print(f"Error Response: {resp.text}")
                print("Result: FAIL")
        except Exception as exc:
            print(f"Request Exception: {exc}")
            print("Result: FAIL")


if __name__ == "__main__":
    db_file = os.path.abspath("local_matsyamitra_test.db")
    db_url = f"sqlite:///{db_file}"
    os.environ["MATSYAMITRA_DATABASE_URL"] = db_url

    setup_test_data(db_url)

    # Use TestClient for in-process HTTP execution without needing open sockets
    from fastapi.testclient import TestClient
    from analytics.api.main import app

    print("\nExecuting HTTP requests via FastAPI TestClient:")
    client = TestClient(app)

    # 1. Health
    r1 = client.get("/api/v1/health")
    print("\n1. GET /api/v1/health ->", r1.status_code)
    print(json.dumps(r1.json(), indent=2))
    assert r1.status_code == 200

    # 2. Current State
    r2 = client.get("/api/v1/current-state")
    print("\n2. GET /api/v1/current-state ->", r2.status_code, f"({len(r2.json())} locations)")
    print("Sample location KARN_001:")
    print(json.dumps(r2.json()[0], indent=2))
    assert r2.status_code == 200
    assert len(r2.json()) == 25

    # 3. Current State by Location
    r3 = client.get("/api/v1/current-state/KARN_001")
    print("\n3. GET /api/v1/current-state/KARN_001 ->", r3.status_code)
    print(json.dumps(r3.json(), indent=2))
    assert r3.status_code == 200

    # 4. Advisories
    r4 = client.get("/api/v1/advisories")
    print("\n4. GET /api/v1/advisories ->", r4.status_code, f"({len(r4.json())} advisories)")
    print(json.dumps(r4.json(), indent=2))
    assert r4.status_code == 200

    # 5. Alerts
    r5 = client.get("/api/v1/alerts")
    print("\n5. GET /api/v1/alerts ->", r5.status_code, f"({len(r5.json())} alerts)")
    print(json.dumps(r5.json(), indent=2))
    assert r5.status_code == 200

    print("\n==================================================")
    print("ALL 5 API ENDPOINTS VERIFIED SUCCESSFULLY (PASS)")
    print("==================================================")
