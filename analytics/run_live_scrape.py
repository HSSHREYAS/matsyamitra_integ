"""Run a single live INCOIS scrape and store results in the configured DB.

This script uses the project's pipeline and persistence; by default it will
use the same local SQLite DB as `local_viewer.py` when `MATSYAMITRA_DATABASE_URL`
is not set.

Usage:
  python analytics/run_live_scrape.py
"""

from __future__ import annotations

import os
import logging

from sqlalchemy.orm import Session

from analytics.persistence.database import create_database_engine, create_tables
from analytics.incois.pipeline import run_incois_pipeline, DEFAULT_SECTOR_ID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("run_live_scrape")


def main() -> None:
    os.environ.setdefault("MATSYAMITRA_DATABASE_URL", "sqlite:///./local_matsyamitra.db")
    engine = create_database_engine()
    create_tables(engine)

    with Session(engine) as session:
        logger.info("Starting live scrape for sector %s", DEFAULT_SECTOR_ID)
        result = run_incois_pipeline(session=session, sector_id=DEFAULT_SECTOR_ID, html_override=None)
        session.commit()
        logger.info("Live scrape finished: inserted=%d skipped=%d parsed=%d no_advisory=%s errors=%s",
                    result.records_inserted, result.records_skipped, result.records_parsed, result.no_advisory_today, result.errors)


if __name__ == "__main__":
    main()
