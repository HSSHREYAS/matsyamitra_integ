"""Tests for MatsyaMitra REST API endpoints."""

import os
from datetime import date, datetime, timezone
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from analytics.api.main import app
from analytics.api.routes import get_engine, get_db_session
from analytics.persistence.models import (
    Base,
    IncoisAdvisory,
    PfzResult,
    RiskResult,
    SamplingLocation,
)


class ApiEndpointsTests(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for isolated API tests
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)

        # Seed test sampling locations
        with Session(self.engine) as session:
            loc1 = SamplingLocation(
                location_id="KARN_001",
                latitude=12.85,
                longitude=74.75,
                is_active=True,
            )
            loc2 = SamplingLocation(
                location_id="KARN_002",
                latitude=13.35,
                longitude=74.65,
                is_active=True,
            )
            session.add_all([loc1, loc2])
            session.flush()

            # Seed PFZ result for KARN_001
            pfz = PfzResult(
                sampling_location_id=loc1.id,
                observation_date=date.today(),
                source="gee",
                sst=28.5,
                chlorophyll=0.45,
                pfz_score=8.2,
                pfz_category="Highly Favourable",
                confidence_score=0.92,
                analytics_version="deterministic-v1",
            )
            session.add(pfz)

            # Seed Risk result for KARN_001 (High Risk)
            risk = RiskResult(
                sampling_location_id=loc1.id,
                observation_timestamp=datetime.now(timezone.utc),
                source="open-meteo",
                wind_speed=24.5,
                wave_height=3.2,
                risk_score=7.8,
                risk_category="High Risk",
                confidence_score=0.95,
                analytics_version="deterministic-v1",
            )
            session.add(risk)

            # Seed INCOIS Advisory
            adv = IncoisAdvisory(
                advisory_date=date.today(),
                sector_id="KARNATAKA",
                landing_center="Mangalore Fishing Harbour",
                bearing_degrees=245.0,
                distance_km=18.5,
                depth_m=35.0,
                latitude=12.90,
                longitude=74.70,
                raw_text="Sample raw INCOIS bulletin text",
                scraped_at=datetime.now(timezone.utc),
                nearest_sampling_location_id=loc1.id,
                distance_to_nearest_km=4.2,
            )
            session.add(adv)
            session.commit()

        # Override the FastAPI dependency
        def override_get_db_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_get_db_session
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_health_endpoint(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["version"], "1.0.0")

    def test_current_state_all_locations(self):
        response = self.client.get("/api/v1/current-state")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)

        karn001 = next(item for item in data if item["location_id"] == "KARN_001")
        self.assertEqual(karn001["city_name"], "Karwar")
        self.assertIsNotNone(karn001["pfz"])
        self.assertEqual(karn001["pfz"]["score"], 8.2)
        self.assertEqual(karn001["pfz"]["category"], "Highly Favourable")
        self.assertIsNotNone(karn001["risk"])
        self.assertEqual(karn001["risk"]["score"], 7.8)
        self.assertEqual(karn001["risk"]["category"], "High Risk")

        karn002 = next(item for item in data if item["location_id"] == "KARN_002")
        self.assertEqual(karn002["city_name"], "Kundapura")
        self.assertIsNone(karn002["pfz"])
        self.assertIsNone(karn002["risk"])

    def test_current_state_by_location_success(self):
        response = self.client.get("/api/v1/current-state/KARN_001")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["location_id"], "KARN_001")
        self.assertEqual(data["city_name"], "Karwar")
        self.assertEqual(data["pfz"]["score"], 8.2)

    def test_current_state_by_location_not_found(self):
        response = self.client.get("/api/v1/current-state/KARN_999")
        self.assertEqual(response.status_code, 404)

    def test_advisories_endpoint(self):
        response = self.client.get("/api/v1/advisories")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["landing_center"], "Mangalore Fishing Harbour")
        self.assertEqual(data[0]["distance_km"], 18.5)

    def test_advisories_filter_by_landing(self):
        response = self.client.get("/api/v1/advisories?landing=mangalore")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)

        response_none = self.client.get("/api/v1/advisories?landing=karwar")
        self.assertEqual(response_none.status_code, 200)
        self.assertEqual(len(response_none.json()), 0)

    def test_alerts_endpoint(self):
        response = self.client.get("/api/v1/alerts")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) >= 2)  # High risk alert + INCOIS alert

        risk_alert = next((a for a in data if a["category"] == "weather"), None)
        self.assertIsNotNone(risk_alert)
        self.assertEqual(risk_alert["severity"], "urgent")
        self.assertEqual(risk_alert["location_id"], "KARN_001")
        self.assertEqual(risk_alert["city_name"], "Karwar")
        self.assertIn("Karwar", risk_alert["title"])

        advisory_alert = next((a for a in data if a["category"] == "advisory"), None)
        self.assertIsNotNone(advisory_alert)
        self.assertEqual(advisory_alert["city_name"], "Karwar")
        self.assertIn("Karwar", advisory_alert["title"])

    def test_pipeline_status_endpoint(self):
        response = self.client.get("/api/v1/pipeline/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("scheduler_running", data)
        self.assertIn("jobs", data)
        self.assertIn("timestamp", data)

    def test_pipeline_trigger_endpoint(self):
        response = self.client.post("/api/v1/pipeline/trigger?job=incois")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "triggered")
        self.assertEqual(data["job"], "incois_sync")

        # Test invalid job
        response_invalid = self.client.post("/api/v1/pipeline/trigger?job=nonexistent")
        self.assertEqual(response_invalid.status_code, 200)
        self.assertEqual(response_invalid.json()["status"], "error")


if __name__ == "__main__":
    unittest.main()
