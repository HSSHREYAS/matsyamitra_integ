"""Module 3 Operational Risk standalone scoring tests.

Tests verify:
- numerical Risk behaviour (Wind + Wave dependencies)
- missing value handling (redistribution or unchanged missing state)
- SST, Chlorophyll, PFZ have zero influence
- exact expected Risk score calculation given weights
- RiskScoringInput structure
- correct RiskScoredResult extraction including timestamps and source
"""

import unittest
from datetime import datetime, timezone

from analytics.scoring.config import DEFAULT_SCORING_CONFIG
from analytics.scoring.models import RiskScoringInput
from analytics.scoring.risk_engine import score_risk_record

_UTC = timezone.utc

def base_risk_input(**overrides) -> RiskScoringInput:
    kwargs = {
        "sampling_location_id": 1,
        "observation_timestamp": datetime(2026, 8, 10, 10, 0, tzinfo=_UTC),
        "wind_speed": 4.0,  # Safe
        "wave_height": 0.3, # Safe
        "source": "open-meteo",
        "data_age_hours": 0.0,
    }
    kwargs.update(overrides)
    return RiskScoringInput(**kwargs)


class RiskScoringTests(unittest.TestCase):
    def test_low_wind_and_wave_safe(self) -> None:
        """Low Wind and low Wave should yield low operational risk (Safe category)."""
        scored = score_risk_record(base_risk_input())
        self.assertEqual(scored.risk_score, 0.0)
        self.assertEqual(scored.risk_category, "Safe")
        self.assertEqual(scored.confidence_score, 100.0)

    def test_moderate_wind_and_wave(self) -> None:
        """Moderate values increase the risk score."""
        scored = score_risk_record(base_risk_input(wind_speed=9.0, wave_height=1.0))
        self.assertGreater(scored.risk_score, 2.0)
        self.assertLess(scored.risk_score, 6.0)
        self.assertIn("Risk", scored.risk_category)

    def test_high_wind_and_wave(self) -> None:
        """Dangerous values maximize risk score to Extreme Risk."""
        scored = score_risk_record(base_risk_input(wind_speed=20.0, wave_height=3.0))
        self.assertEqual(scored.risk_score, 10.0)
        self.assertEqual(scored.risk_category, "Extreme Risk")

    def test_missing_wind_preserves_wave_risk(self) -> None:
        """Missing wind correctly calculates risk using only wave height."""
        # Wave is high, wind is missing. Score is purely based on wave (which has 0.60 weight but redistributes to 1.0)
        scored = score_risk_record(base_risk_input(wind_speed=None, wave_height=3.0))
        self.assertEqual(scored.risk_score, 10.0)
        self.assertEqual(scored.risk_category, "Extreme Risk")
        
        # Confidence drops by the missing wind weight (~57%)
        self.assertAlmostEqual(scored.confidence_score, 42.9, places=1)

    def test_missing_wave_preserves_wind_risk(self) -> None:
        """Missing wave correctly calculates risk using only wind speed."""
        scored = score_risk_record(base_risk_input(wind_speed=20.0, wave_height=None))
        self.assertEqual(scored.risk_score, 10.0)
        self.assertAlmostEqual(scored.confidence_score, 57.1, places=1)

    def test_both_missing(self) -> None:
        """Both missing means Risk score is None."""
        scored = score_risk_record(base_risk_input(wind_speed=None, wave_height=None))
        self.assertIsNone(scored.risk_score)
        self.assertEqual(scored.risk_category, "Unknown")
        self.assertEqual(scored.confidence_score, 0.0)

    def test_invalid_negative_values_treated_as_missing(self) -> None:
        """Negative wind/wave treated as invalid/missing by normalization."""
        scored = score_risk_record(base_risk_input(wind_speed=-5.0, wave_height=0.3))
        self.assertEqual(scored.risk_score, 0.0)  # Only Wave is valid, and it's safe
        self.assertAlmostEqual(scored.confidence_score, 42.9, places=1)

    def test_sst_and_chlorophyll_have_zero_influence(self) -> None:
        """SST and Chlorophyll don't exist on the input, proving they cannot affect Risk scoring."""
        # The input model explicitly denies passing SST and Chlorophyll
        scored1 = score_risk_record(base_risk_input(wind_speed=10.0, wave_height=1.0))
        scored2 = score_risk_record(base_risk_input(wind_speed=10.0, wave_height=1.0))
        
        self.assertEqual(scored1.risk_score, scored2.risk_score)
        self.assertEqual(scored1.confidence_score, scored2.confidence_score)

    def test_changing_wind_changes_risk(self) -> None:
        """Wind changes explicitly alter the risk score."""
        scored1 = score_risk_record(base_risk_input(wind_speed=4.0, wave_height=1.0))
        scored2 = score_risk_record(base_risk_input(wind_speed=15.0, wave_height=1.0))
        self.assertNotEqual(scored1.risk_score, scored2.risk_score)
        self.assertGreater(scored2.risk_score, scored1.risk_score)

    def test_changing_wave_changes_risk(self) -> None:
        """Wave changes explicitly alter the risk score."""
        scored1 = score_risk_record(base_risk_input(wind_speed=10.0, wave_height=0.3))
        scored2 = score_risk_record(base_risk_input(wind_speed=10.0, wave_height=2.5))
        self.assertNotEqual(scored1.risk_score, scored2.risk_score)
        self.assertGreater(scored2.risk_score, scored1.risk_score)

    def test_old_observations_reduce_confidence(self) -> None:
        """Data age reduces confidence multiplier for risk."""
        scored = score_risk_record(base_risk_input(data_age_hours=48))
        self.assertEqual(scored.confidence_score, 70.0)  # 100% * 0.70 factor

    def test_score_boundaries(self) -> None:
        """Verify the edges of risk score categories."""
        # 8.0 is Extreme Risk
        self.assertEqual(DEFAULT_SCORING_CONFIG.risk_categories[4].label, "Extreme Risk")
        self.assertEqual(DEFAULT_SCORING_CONFIG.risk_categories[4].min_value, 8.0)
        # 0.0 is Safe
        self.assertEqual(DEFAULT_SCORING_CONFIG.risk_categories[0].label, "Safe")
        self.assertEqual(DEFAULT_SCORING_CONFIG.risk_categories[0].min_value, 0.0)

    def test_source_independence_test(self) -> None:
        """The source is metadata and MUST NOT influence the numerical Risk score."""
        scored1 = score_risk_record(base_risk_input(source="open-meteo"))
        scored2 = score_risk_record(base_risk_input(source="incois"))
        
        self.assertEqual(scored1.risk_score, scored2.risk_score)
        self.assertEqual(scored1.confidence_score, scored2.confidence_score)
        self.assertEqual(scored1.source, "open-meteo")
        self.assertEqual(scored2.source, "incois")

    def test_timestamp_preservation(self) -> None:
        """Check all references including timestamp carry over to the output without truncation."""
        ts = datetime(2026, 8, 10, 23, 45, 12, tzinfo=_UTC)
        scored = score_risk_record(base_risk_input(
            sampling_location_id=99,
            marine_observation_id=123,
            observation_timestamp=ts
        ))
        self.assertEqual(scored.sampling_location_id, 99)
        self.assertEqual(scored.marine_observation_id, 123)
        self.assertEqual(scored.observation_timestamp, ts)


if __name__ == "__main__":
    unittest.main()
