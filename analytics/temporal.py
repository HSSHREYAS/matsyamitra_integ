from datetime import date, timedelta

from .config import DateRange


def date_range_for_analysis_date(analysis_date: str, window_days: int = 1) -> DateRange:
    start_date = date.fromisoformat(analysis_date)
    end_date = start_date + timedelta(days=window_days)
    return DateRange(start=start_date.isoformat(), end=end_date.isoformat())


def describe_temporal_window(date_range: DateRange) -> str:
    return (
        f"Observations are selected from {date_range.start} inclusive "
        f"to {date_range.end} exclusive."
    )
