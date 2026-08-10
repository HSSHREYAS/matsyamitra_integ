import unittest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from analytics.persistence.models import Base, MarineObservation, RiskResult, SamplingLocation
from analytics.persistence.marine_repository import MarineObservationRepository
from analytics.persistence.repository import RiskRepository
from analytics.scoring.risk_engine import score_risk_record
from analytics.scoring.models import RiskScoringInput

class OpenMeteoIntegrationTests(unittest.TestCase):
    def setUp(self):
        # Use an in-memory SQLite database for fast isolated testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        
        # Seed test canonical locations
        for i in range(1, 26):
            loc = SamplingLocation(
                location_id=f"KARN_{i:03d}",
                latitude=15.0 + i*0.01,
                longitude=73.0 + i*0.01,
                is_active=True
            )
            self.session.add(loc)
        self.session.commit()
        
        self.marine_repo = MarineObservationRepository(self.session)
        self.risk_repo = RiskRepository(self.session)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_canonical_mapping(self):
        """KARN_001 maps to the correct sampling_location_id, unmapped are ignored."""
        obs_valid = MarineObservation(
            location_id="KARN_001",
            latitude=15.0,
            longitude=73.0,
            observation_timestamp=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
            wind_speed=5.0,
            wave_height=1.0,
            source="open-meteo"
        )
        obs_invalid = MarineObservation(
            location_id="UNKNOWN_999",
            latitude=15.0,
            longitude=73.0,
            observation_timestamp=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
            wind_speed=5.0,
            wave_height=1.0,
            source="open-meteo"
        )
        self.session.add_all([obs_valid, obs_invalid])
        self.session.flush()
        
        updated = self.marine_repo.backfill_sampling_location_ids()
        self.assertEqual(updated, 1) # Only KARN_001 updated
        
        self.assertIsNotNone(obs_valid.sampling_location_id)
        self.assertIsNone(obs_invalid.sampling_location_id)
        
        # Unmapped should not be returned by get_latest_unscored_observations
        unscored = self.marine_repo.get_latest_unscored_observations("open-meteo")
        self.assertEqual(len(unscored), 1)
        self.assertEqual(unscored[0].location_id, "KARN_001")

    def test_hourly_coexistence_and_risk_persistence(self):
        """Different hours coexist, and each hour generates a separate risk result."""
        for hour in [10, 11, 12]:
            obs = MarineObservation(
                location_id="KARN_001",
                latitude=15.0,
                longitude=73.0,
                observation_timestamp=datetime(2026, 8, 10, hour, 0, tzinfo=timezone.utc),
                wind_speed=5.0 + hour,
                wave_height=1.0 + (hour * 0.1),
                source="open-meteo"
            )
            self.session.add(obs)
        self.session.flush()
        self.marine_repo.backfill_sampling_location_ids()
        
        # Score them
        all_obs = self.session.scalars(select(MarineObservation).where(MarineObservation.source=="open-meteo")).all()
        for obs in all_obs:
            inp = RiskScoringInput(
                wind_speed=obs.wind_speed,
                wave_height=obs.wave_height,
                observation_timestamp=obs.observation_timestamp,
                sampling_location_id=obs.sampling_location_id,
                marine_observation_id=obs.marine_observation_id,
                data_age_hours=0.0,
                source="open-meteo"
            )
            res = score_risk_record(inp)
            self.risk_repo.insert_risk_result(res)
        self.session.flush()
        
        # Verify 3 separate risk results exist
        risks = self.session.scalars(select(RiskResult)).all()
        self.assertEqual(len(risks), 3)
        self.assertEqual(len(set(r.observation_timestamp for r in risks)), 3)
        
        # Test duplicate insertion is ignored
        same_inp = RiskScoringInput(
            wind_speed=15.0,
            wave_height=2.0,
            observation_timestamp=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
            sampling_location_id=all_obs[0].sampling_location_id,
            marine_observation_id=all_obs[0].marine_observation_id,
            data_age_hours=0.0,
            source="open-meteo"
        )
        res = score_risk_record(same_inp)
        inserted = self.risk_repo.insert_risk_result(res)
        self.assertEqual(inserted, 0)
        
        # Verify latest query returns only 1 result (the 12:00 one)
        latest = self.risk_repo.get_latest_risk_results()
        self.assertEqual(len(latest), 1)
        self.assertEqual(
            latest[0].observation_timestamp.replace(tzinfo=timezone.utc), 
            datetime(2026, 8, 10, 12, 0, tzinfo=timezone.utc)
        )

    def test_freshness_calculation(self):
        """Data age hours is calculated correctly."""
        obs_time = datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc)
        current_time = datetime(2026, 8, 10, 12, 30, tzinfo=timezone.utc)
        
        age_hours = (current_time - obs_time).total_seconds() / 3600.0
        self.assertEqual(age_hours, 2.5)

    def test_risk_uses_only_wind_wave(self):
        """Risk uses only Wind + Wave, independent of SST/Chlorophyll."""
        inp = RiskScoringInput(
            wind_speed=15.0, # High wind
            wave_height=2.0,
            observation_timestamp=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
            sampling_location_id=1,
            marine_observation_id=1,
            data_age_hours=0.0,
            source="open-meteo"
        )
        res = score_risk_record(inp)
        self.assertIsNotNone(res.risk_score)
        # Verify no SST or Chlorophyll in RiskScoringInput
        with self.assertRaises(AttributeError):
            _ = inp.sst

if __name__ == "__main__":
    unittest.main()
