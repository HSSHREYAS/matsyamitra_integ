"""
INCOIS Advisory Scraper & Database Ingestion CLI.

Fetches live Potential Fishing Zone (PFZ) advisories for Karnataka coastal
sectors directly from the official INCOIS marine portal (https://incois.gov.in),
matches each coordinate against canonical Karnataka coastal sampling locations,
and saves the records into the PostgreSQL database.

Usage:
    # Run once for default Karnataka sector (SEC004):
    python analytics/incois/scrape_incois_advisories.py

    # Run for a specific sector:
    python analytics/incois/scrape_incois_advisories.py --sector SEC004

    # Dry-run (scrape & parse without writing to database):
    python analytics/incois/scrape_incois_advisories.py --dry-run
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

# Ensure project root is on PYTHONPATH
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(_PROJECT_ROOT / ".env")

from sqlalchemy.orm import Session
from analytics.persistence.database import create_database_engine, create_tables
from analytics.incois.pipeline import run_incois_pipeline, DEFAULT_SECTOR_ID
from analytics.incois.scraper import scrape_incois_advisory
from analytics.incois.parser import parse_advisory_html

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("scrape_incois_advisories")


def scrape_and_ingest(sector_id: str = DEFAULT_SECTOR_ID, dry_run: bool = False) -> int:
    """
    Scrape INCOIS PFZ bulletins and ingest them into the database.

    Returns:
        Number of records successfully inserted or parsed.
    """
    print(f"\n==================================================================")
    print(f"  MatsyaMitra — INCOIS Advisory Scraper & Ingestion Pipeline")
    print(f"  Target Sector: {sector_id} (Karnataka Coast)")
    print(f"  Mode: {'DRY RUN (No DB write)' if dry_run else 'LIVE INGESTION'}")
    print(f"==================================================================\n")

    if dry_run:
        logger.info("Fetching INCOIS advisory HTML for sector %s ...", sector_id)
        html = scrape_incois_advisory(sector_id=sector_id)
        if not html:
            logger.error("Failed to retrieve advisory HTML from INCOIS portal.")
            return 0

        records = parse_advisory_html(html)
        print(f"\n[DRY RUN RESULT] Successfully parsed {len(records)} PFZ advisories:\n")
        for i, rec in enumerate(records, 1):
            print(
                f"  {i:2d}. Landing Center : {rec.landing_center:<18} "
                f"Bearing: {rec.bearing_degrees or 0:3.0f}°  "
                f"Dist: {rec.distance_km or 0:5.1f}km  "
                f"Depth: {rec.depth_m or 0:4.0f}m  "
                f"Coords: ({rec.latitude:.2f}°N, {rec.longitude:.2f}°E)"
            )
        print()
        return len(records)

    # Live Database Ingestion
    db_url = os.getenv("MATSYAMITRA_DATABASE_URL")
    if not db_url:
        logger.error("MATSYAMITRA_DATABASE_URL environment variable is not set in .env")
        sys.exit(1)

    logger.info("Connecting to database: %s", db_url.split("@")[-1] if "@" in db_url else db_url)
    engine = create_database_engine()
    create_tables(engine)

    with Session(engine) as session:
        logger.info("Running INCOIS ingestion pipeline for sector: %s", sector_id)
        result = run_incois_pipeline(session=session, sector_id=sector_id)
        session.commit()

    print(f"\n------------------------------------------------------------------")
    print(f"  Pipeline Result: {'SUCCESS' if result.success else 'FAILED'}")
    print(f"  Sector ID      : {result.sector_id}")
    print(f"  Advisory Date  : {result.advisory_date}")
    print(f"  Records Parsed : {result.records_parsed}")
    print(f"  Records Matched: {result.records_matched}")
    print(f"  Inserted (New) : {result.records_inserted}")
    print(f"  Skipped (Exist): {result.records_skipped}")
    if result.errors:
        print(f"  Errors         : {', '.join(result.errors)}")
    print(f"------------------------------------------------------------------\n")

    return result.records_inserted


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape and ingest live INCOIS PFZ advisories into MatsyaMitra."
    )
    parser.add_argument(
        "--sector",
        type=str,
        default=DEFAULT_SECTOR_ID,
        help=f"INCOIS sector code (default: {DEFAULT_SECTOR_ID} = Karnataka)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and print parsed records without modifying the database.",
    )

    args = parser.parse_args()
    scrape_and_ingest(sector_id=args.sector, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
