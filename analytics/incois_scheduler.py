"""
INCOIS Advisory Scraper Scheduler.

Uses APScheduler to run the INCOIS pipeline every 6 hours automatically.
Keeps all scheduling logic inside the Python backend — no external cron needed.

Usage:
    # Run once immediately (for testing / manual trigger):
    python analytics/incois_scheduler.py --once

    # Run as a persistent daemon (scrapes every 6 hours):
    python analytics/incois_scheduler.py

    # Run with a custom sector:
    python analytics/incois_scheduler.py --sector SEC004

    # Adjust interval (hours):
    python analytics/incois_scheduler.py --interval 4

npm shortcuts (from package.json):
    npm run incois:scrape      →  python ... --once
    npm run incois:schedule    →  python ... (daemon)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure analytics package is importable when run from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(_PROJECT_ROOT / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from analytics.incois.pipeline import run_incois_pipeline, DEFAULT_SECTOR_ID

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("incois_scheduler")


# ---------------------------------------------------------------------------
# Database connection
# ---------------------------------------------------------------------------

def _get_database_url() -> str:
    """Load database URL from environment variable."""
    url = os.getenv("MATSYAMITRA_DATABASE_URL", "")
    if not url:
        logger.error(
            "MATSYAMITRA_DATABASE_URL environment variable is not set. "
            "Example: postgresql://user:password@localhost/matsyamitra"
        )
        sys.exit(1)
    return url


def _create_engine():
    url = _get_database_url()
    return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2)


# ---------------------------------------------------------------------------
# The scraping job
# ---------------------------------------------------------------------------

def run_scrape_job(sector_id: str = DEFAULT_SECTOR_ID) -> None:
    """
    Execute one INCOIS scraping cycle. Called by APScheduler on each tick.
    """
    start = datetime.now(timezone.utc)
    logger.info("━━━ INCOIS Scrape Job START — %s UTC ━━━", start.strftime("%Y-%m-%d %H:%M:%S"))

    try:
        engine = _create_engine()
        with Session(engine) as session:
            result = run_incois_pipeline(session=session, sector_id=sector_id)
            session.commit()

        if result.success:
            logger.info("Scrape job completed successfully: %s", result)
        elif result.no_advisory_today:
            logger.info("No advisory issued today — nothing stored.")
        else:
            logger.warning("Scrape job completed with issues: %s", result)
            for err in result.errors:
                logger.warning("  Error: %s", err)

    except Exception as exc:
        logger.error("Scrape job raised an unexpected exception: %s", exc, exc_info=True)

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    logger.info("━━━ INCOIS Scrape Job END (%.1fs) ━━━", elapsed)


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------

def run_daemon(sector_id: str, interval_hours: int) -> None:
    """Start APScheduler as a blocking daemon, running every `interval_hours`."""
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
    except ImportError:
        logger.error(
            "APScheduler is not installed. Run: pip install apscheduler"
        )
        sys.exit(1)

    scheduler = BlockingScheduler(timezone="UTC")

    scheduler.add_job(
        func=run_scrape_job,
        trigger="interval",
        hours=interval_hours,
        kwargs={"sector_id": sector_id},
        id="incois_scrape",
        name=f"INCOIS Advisory Scraper — every {interval_hours}h",
        replace_existing=True,
        # Run once immediately at startup, then on the interval
        next_run_time=datetime.now(timezone.utc),
    )

    logger.info(
        "INCOIS Scheduler started. Sector: %s | Interval: every %dh | Next run: now",
        sector_id,
        interval_hours,
    )
    logger.info("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")
        scheduler.shutdown()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="INCOIS Marine Fisheries Advisory Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once immediately and exit (no scheduling).",
    )
    parser.add_argument(
        "--sector",
        default=DEFAULT_SECTOR_ID,
        help=f"INCOIS sector ID to scrape (default: {DEFAULT_SECTOR_ID}).",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=6,
        help="Interval in hours between scrape runs (default: 6).",
    )

    args = parser.parse_args()

    if args.once:
        logger.info("Running single scrape for sector %s …", args.sector)
        run_scrape_job(sector_id=args.sector)
    else:
        run_daemon(sector_id=args.sector, interval_hours=args.interval)


if __name__ == "__main__":
    main()
