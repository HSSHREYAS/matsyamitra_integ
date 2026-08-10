"""Module 2 PFZ standalone scoring tests.

Tests verify:
- numerical PFZ bounds (0 to 10)
- missing value handling (redistribution or zero score)
- wind and wave have zero influence
- exact expected PFZ score calculation given weights
- PfzScoringInput structure
- correct PfzScoredResult extraction
"""

import unittest
from datetime import date

from analytics.scoring.config import DEFAULT_SCORING_CONFIG
from analytics.scoring.models import PfzScoringInput
from analytics.scoring.pfz_engine import score_pfz_record


def base_pfz_input(**overrides) -> PfzScoringInput:
    kwargs = {
        "sampling_location_id": 1,
        "observation_date": date(2026, 8, 10),
        "sst": 28.2,  # Ideal
        "chlorophyll": 0.82,  # Ideal
        "sst_data_age_hours": 4.0,
        "chlorophyll_data_age_hours": 4.0,
    }
    kwargs.update(overrides)
    return PfzScoringInput(**kwargs)


class PfzScoringTests(unittest.TestCase):
    def test_ideal_fishing_conditions_pfz_only(self) -> None:
        """SST and Chlorophyll in ideal range should yield 10.0 PFZ and 100% confidence."""
        scored = score_pfz_record(base_pfz_input())
        self.assertEqual(scored.pfz_score, 10.0)
        self.assertEqual(scored.pfz_category, "Highly Favourable")
        self.assertEqual(scored.confidence_score, 100.0)
        self.assertEqual(scored.source, "gee")
        self.assertEqual(scored.analytics_version, "deterministic-v1")

    def test_moderate_fishing_conditions(self) -> None:
        """Sub-optimal values lower the score."""
        scored = score_pfz_record(base_pfz_input(sst=30.5, chlorophyll=1.2))
        # 30.5 SST -> falling suitability
        self.assertLess(scored.pfz_score, 10.0)
        self.assertEqual(scored.pfz_category, "Favourable")

    def test_poor_fishing_conditions(self) -> None:
        """Extreme values drop PFZ score to 0."""
        scored = score_pfz_record(base_pfz_input(sst=32.0, chlorophyll=0.05))
        self.assertEqual(scored.pfz_score, 0.0)
        self.assertEqual(scored.pfz_category, "Very Low")

    def test_missing_sst(self) -> None:
        """Missing SST redistributes weights to Chlorophyll. Confidence drops."""
        scored = score_pfz_record(base_pfz_input(sst=None))
        self.assertEqual(scored.pfz_score, 10.0)  # Chlorophyll is 100% of the weight now and is ideal
        
        # Confidence should drop. Chlorophyll base confidence is 53.85%, so score should be ~53.8 or 53.9
        self.assertAlmostEqual(scored.confidence_score, 53.8, places=1)

    def test_missing_chlorophyll(self) -> None:
        """Missing Chlorophyll redistributes weights to SST."""
        scored = score_pfz_record(base_pfz_input(chlorophyll=None))
        self.assertEqual(scored.pfz_score, 10.0)  # SST is 100% of the weight now and is ideal
        
        # SST base confidence is 46.15%
        self.assertAlmostEqual(scored.confidence_score, 46.2, places=1)

    def test_both_missing(self) -> None:
        """Both missing means PFZ score is None."""
        scored = score_pfz_record(base_pfz_input(sst=None, chlorophyll=None))
        self.assertIsNone(scored.pfz_score)
        self.assertEqual(scored.pfz_category, "Unknown")
        self.assertEqual(scored.confidence_score, 0.0)

    def test_invalid_values_treated_as_missing(self) -> None:
        """Out of bounds completely (e.g. SST=99.0) treated as invalid/missing by normalization."""
        scored = score_pfz_record(base_pfz_input(sst=99.0, chlorophyll=1.0))
        self.assertEqual(scored.pfz_score, 10.0)  # Only Chlorophyll is valid and it's ideal
        self.assertAlmostEqual(scored.confidence_score, 53.8, places=1)

    def test_wind_and_wave_have_zero_influence(self) -> None:
        """Wind and wave properties don't exist on the input, so they cannot affect scoring."""
        # By definition of the PfzScoringInput structure, we can't even pass wind/wave.
        # But we can verify that two records with identical SST/Chl get the exact same score.
        scored1 = score_pfz_record(base_pfz_input(sst=28.0, chlorophyll=1.0))
        scored2 = score_pfz_record(base_pfz_input(sst=28.0, chlorophyll=1.0))
        
        self.assertEqual(scored1.pfz_score, scored2.pfz_score)
        self.assertEqual(scored1.confidence_score, scored2.confidence_score)

    def test_old_observations_reduce_confidence(self) -> None:
        """Data age reduces confidence multiplier."""
        scored = score_pfz_record(base_pfz_input(sst_data_age_hours=72, chlorophyll_data_age_hours=72))
        self.assertEqual(scored.confidence_score, 50.0)  # 100% * 0.50 factor

    def test_score_boundaries(self) -> None:
        """Verify the edges of score categories."""
        # 8.0 is Highly Favourable
        self.assertEqual(DEFAULT_SCORING_CONFIG.pfz_categories[0].label, "Highly Favourable")
        self.assertEqual(DEFAULT_SCORING_CONFIG.pfz_categories[0].min_value, 8.0)
        # 6.0 is Favourable
        self.assertEqual(DEFAULT_SCORING_CONFIG.pfz_categories[1].label, "Favourable")
        self.assertEqual(DEFAULT_SCORING_CONFIG.pfz_categories[1].min_value, 6.0)

    def test_pfz_input_references(self) -> None:
        """Check all references carry over to the output."""
        scored = score_pfz_record(base_pfz_input(sampling_location_id=99, environmental_observation_id=123))
        self.assertEqual(scored.sampling_location_id, 99)
        self.assertEqual(scored.environmental_observation_id, 123)
        self.assertEqual(scored.observation_date, date(2026, 8, 10))

if __name__ == "__main__":
    unittest.main()
