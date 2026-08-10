import unittest
from datetime import date, timedelta
from analytics.config import AnalysisDateConfig

class ConfigTests(unittest.TestCase):

    def test_analysis_date_config_historical(self):
        # Explicit historical date override
        config = AnalysisDateConfig(analysis_date="2025-06-01", window_days=2)
        dr = config.to_date_range()
        self.assertEqual(dr.start, "2025-06-01")
        self.assertEqual(dr.end, "2025-06-03")

    def test_analysis_date_config_operational(self):
        # No explicit date -> current-date operational mode
        config = AnalysisDateConfig(analysis_date=None, window_days=14)
        dr = config.to_date_range()
        
        today = date.today()
        start_date = today - timedelta(days=14)
        
        self.assertEqual(dr.end, today.isoformat())
        self.assertEqual(dr.start, start_date.isoformat())

    def test_analysis_date_config_invalid_window(self):
        with self.assertRaises(ValueError):
            AnalysisDateConfig(analysis_date=None, window_days=0)
            
if __name__ == "__main__":
    unittest.main()
