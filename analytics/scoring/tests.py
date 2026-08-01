from datetime import datetime
import unittest

import pandas as pd

from analytics.scoring.engine import score_dataframe, score_record
from analytics.scoring.normalization import (
    rising_risk_index,
    trapezoid_suitability,
    wind_pfz_suitability,
)
from analytics.scoring.config import DEFAULT_SCORING_CONFIG


def base_record(**overrides):
    record = {
        "Latitude": 14.1,
        "Longitude": 74.1,
        "Date": "2025-06-01",
        "SST": 28.2,
        "WindSpeed": 6.5,
        "WaveHeight": 1.1,
        "Chlorophyll": 0.82,
        "DataAgeHours": 4,
    }
    record.update(overrides)
    return record


class ScoringEngineTests(unittest.TestCase):
    def test_ideal_fishing_conditions(self) -> None:
        scored = score_record(base_record())

        self.assertEqual(scored.pfz_score, 10.0)
        self.assertEqual(scored.pfz_category, "Highly Favourable")
        self.assertEqual(scored.risk_score, 1.8)
        self.assertEqual(scored.risk_category, "Safe")
        self.assertEqual(scored.confidence_score, 100.0)
        self.assertEqual(scored.confidence_label, "High")

    def test_moderate_fishing_conditions(self) -> None:
        scored = score_record(base_record(SST=30.5, WindSpeed=11.0, WaveHeight=1.8, Chlorophyll=1.2))

        self.assertEqual(scored.pfz_category, "Favourable")
        self.assertEqual(scored.risk_category, "Moderate Risk")

    def test_poor_fishing_conditions(self) -> None:
        scored = score_record(base_record(SST=32.0, Chlorophyll=0.05, WindSpeed=16.0, WaveHeight=1.0))

        self.assertEqual(scored.pfz_score, 0.0)
        self.assertEqual(scored.pfz_category, "Very Low")

    def test_dangerous_weather(self) -> None:
        scored = score_record(base_record(WindSpeed=15.0, WaveHeight=3.2))

        self.assertEqual(scored.risk_category, "Extreme Risk")
        self.assertGreaterEqual(scored.risk_score, 9.0)

    def test_missing_chlorophyll_redistributes_pfz_weights_and_reduces_confidence(self) -> None:
        scored = score_record(base_record(Chlorophyll=None))

        self.assertEqual(scored.pfz_score, 10.0)
        self.assertEqual(scored.confidence_score, 65.0)
        self.assertEqual(scored.confidence_label, "Moderate")
        self.assertIn("Chlorophyll", scored.explanation)

    def test_missing_wave_height_uses_wind_only_for_risk(self) -> None:
        scored = score_record(base_record(WindSpeed=11.0, WaveHeight=None))

        self.assertEqual(scored.risk_score, 5.0)
        self.assertEqual(scored.risk_category, "Moderate Risk")
        self.assertEqual(scored.confidence_score, 85.0)

    def test_missing_wind_reduces_confidence_but_keeps_other_scores(self) -> None:
        scored = score_record(base_record(WindSpeed=None, WaveHeight=1.1))

        self.assertEqual(scored.pfz_score, 10.0)
        self.assertEqual(scored.risk_score, 3.0)
        self.assertEqual(scored.confidence_score, 80.0)

    def test_invalid_sst_is_excluded_from_pfz_and_confidence(self) -> None:
        scored = score_record(base_record(SST=99.0, Chlorophyll=1.0, WindSpeed=6.0))

        self.assertEqual(scored.pfz_score, 10.0)
        self.assertEqual(scored.confidence_score, 70.0)
        self.assertIn("SST", scored.explanation)

    def test_old_observations_reduce_confidence(self) -> None:
        scored = score_record(base_record(DataAgeHours=72))

        self.assertEqual(scored.confidence_score, 50.0)
        self.assertEqual(scored.confidence_label, "Low")
        self.assertIn("Older observation", scored.explanation)

    def test_partial_observations_without_pfz_inputs(self) -> None:
        scored = score_record(
            base_record(SST=None, Chlorophyll=None, WindSpeed=None, WaveHeight=1.0)
        )

        self.assertIsNone(scored.pfz_score)
        self.assertEqual(scored.pfz_category, "Unknown")
        self.assertEqual(scored.risk_score, 2.5)
        self.assertEqual(scored.confidence_score, 15.0)
        self.assertEqual(scored.confidence_label, "Very Low")

    def test_normalization_boundaries(self) -> None:
        config = DEFAULT_SCORING_CONFIG

        self.assertEqual(trapezoid_suitability(27.5, config.sst), 1.0)
        self.assertEqual(trapezoid_suitability(25.0, config.sst), 0.5)
        self.assertEqual(trapezoid_suitability(30.0, config.sst), 0.5)
        self.assertAlmostEqual(wind_pfz_suitability(10.0, config.wind_pfz), 5.0 / 7.0)
        self.assertEqual(rising_risk_index(14.0, config.wind_risk), 0.75)

    def test_score_dataframe(self) -> None:
        dataframe = pd.DataFrame([base_record(), base_record(SST=32.0)])
        scored = score_dataframe(dataframe)

        self.assertEqual(len(scored), 2)
        self.assertIn("PFZScore", scored.columns)
        self.assertIn("Explanation", scored.columns)

    def test_accepts_existing_environmental_record_shape(self) -> None:
        scored = score_record(
            {
                "latitude": 14.1,
                "longitude": 74.1,
                "date": datetime(2025, 6, 1),
                "sst": 28.2,
                "wind_speed": 6.5,
                "wave_height": 1.1,
                "chlorophyll": 0.82,
                "data_age_hours": 4,
            }
        )

        self.assertEqual(scored.pfz_score, 10.0)


if __name__ == "__main__":
    unittest.main()
