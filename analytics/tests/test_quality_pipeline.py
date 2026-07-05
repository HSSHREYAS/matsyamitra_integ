import unittest

import pandas as pd

from analytics.cleaner import standardize_validate_and_clean
from analytics.config import CleaningConfig
from analytics.metadata import get_parameter_metadata, get_required_record_columns
from analytics.quality import validate_environmental_dataframe
from analytics.report import run_quality_assurance_pipeline
from analytics.schemas import EnvironmentalRecord
from analytics.standardizer import standardize_environmental_dataframe


def sample_dataframe() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Latitude": 14.1,
                "Longitude": 74.1,
                "Date": "2025-06-01",
                "SST": 29.5,
                "WindSpeed": 7.2,
                "WaveHeight": 1.1,
                "Chlorophyll": 0.2,
            },
            {
                "Latitude": 14.2,
                "Longitude": 74.2,
                "Date": "2025-06-01",
                "SST": 99.0,
                "WindSpeed": 8.1,
                "WaveHeight": 1.2,
                "Chlorophyll": 0.3,
            },
            {
                "Latitude": 14.3,
                "Longitude": 74.3,
                "Date": "2025-06-01",
                "SST": 28.8,
                "WindSpeed": None,
                "WaveHeight": 0.8,
                "Chlorophyll": -1.0,
            },
            {
                "Latitude": 14.1,
                "Longitude": 74.1,
                "Date": "2025-06-01",
                "SST": 29.5,
                "WindSpeed": 7.2,
                "WaveHeight": 1.1,
                "Chlorophyll": 0.2,
            },
        ]
    )


class QualityPipelineTests(unittest.TestCase):
    def test_metadata_loading(self) -> None:
        metadata = get_parameter_metadata("SST")

        self.assertEqual(metadata.canonical_unit, "Celsius")
        self.assertIn("WindSpeed", get_required_record_columns())

    def test_standardizer_enforces_units_and_columns(self) -> None:
        standardized = standardize_environmental_dataframe(sample_dataframe())

        self.assertEqual(
            list(standardized.columns),
            ["Latitude", "Longitude", "Date", "SST", "WindSpeed", "WaveHeight", "Chlorophyll"],
        )
        self.assertEqual(str(standardized["SST"].dtype), "Float64")
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(standardized["Date"]))

    def test_quality_detects_missing_outliers_and_duplicates(self) -> None:
        standardized = standardize_environmental_dataframe(sample_dataframe())
        result = validate_environmental_dataframe(standardized)

        summaries = {summary.column: summary for summary in result.parameter_summaries}
        self.assertEqual(summaries["WindSpeed"].missing_count, 1)
        self.assertEqual(summaries["SST"].outlier_count, 1)
        self.assertEqual(summaries["Chlorophyll"].invalid_count, 1)
        self.assertEqual(result.duplicate_count, 1)

    def test_cleaner_removes_invalid_and_duplicate_rows(self) -> None:
        cleaned, _ = standardize_validate_and_clean(sample_dataframe())

        self.assertEqual(len(cleaned), 1)
        self.assertEqual(float(cleaned.iloc[0]["SST"]), 29.5)

    def test_missing_value_fill_policy(self) -> None:
        standardized = standardize_environmental_dataframe(sample_dataframe())
        result = validate_environmental_dataframe(standardized)
        cleaning = CleaningConfig(
            remove_invalid_rows=False,
            duplicate_policy="keep",
            missing_value_strategy="fill",
            missing_fill_values={"WindSpeed": 0.0},
        )

        cleaned, _ = standardize_validate_and_clean(standardized, cleaning)

        self.assertEqual(cleaned["WindSpeed"].isna().sum(), 0)

    def test_report_generation(self) -> None:
        report = run_quality_assurance_pipeline(sample_dataframe())

        self.assertIn("Extraction Summary", report.human_readable)
        self.assertEqual(report.summary["extraction_summary"]["rows_sampled"], 4)
        self.assertIn("SST", report.summary["parameter_quality"])

    def test_invalid_identity_values_are_removed(self) -> None:
        dataframe = sample_dataframe()
        dataframe.loc[0, "Latitude"] = 120.0

        cleaned, validation_result = standardize_validate_and_clean(dataframe)

        self.assertEqual(validation_result.invalid_identity_count, 1)
        self.assertFalse((cleaned["Latitude"] == 120.0).any())

    def test_environmental_record_schema(self) -> None:
        standardized = standardize_environmental_dataframe(sample_dataframe())
        record = EnvironmentalRecord.from_row(standardized.iloc[0].to_dict())

        self.assertEqual(record.sst, 29.5)
        self.assertEqual(record.wind_speed, 7.2)


if __name__ == "__main__":
    unittest.main()
