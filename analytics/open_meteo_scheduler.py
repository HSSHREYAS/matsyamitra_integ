"""
Open-Meteo Marine / Risk Pipeline Scheduler.

Uses APScheduler to run the Open-Meteo pipeline every 4 hours automatically.
Keeps all scheduling logic inside the Python backend — no external cron needed.

Usage:
    # Run once immediately (for testing / manual trigger):
    python analytics/open_meteo_scheduler.py --once

    # Run as a persistent daemon (runs every 4 hours):
    python analytics/open_meteo_scheduler.py

    # Adjust interval (hours):
    python analytics/open_meteo_scheduler.py --interval 4

npm shortcuts (from package.json):
    npm run marine:sync        ->  python -m analytics.live_open_meteo_pipeline
    npm run marine:schedule    ->  python -m analytics.open_meteo_scheduler
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is on sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from analytics.live_open_meteo_pipeline import main as run_open_meteo_pipeline

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("open_meteo_scheduler")

DEFAULT_INTERVAL_HOURS = 4


# ---------------------------------------------------------------------------
# Pipeline execution job
# ---------------------------------------------------------------------------

def run_pipeline_job() -> None:
    """
    Execute one Open-Meteo ingestion + risk calculation cycle.
    Called by APScheduler on each interval tick.
    """
    start = datetime.now(timezone.utc)
    logger.info("=== Open-Meteo Marine/Risk Pipeline Job START - %s UTC ===", start.strftime("%Y-%m-%d %H:%M:%S"))

    try:
        run_open_meteo_pipeline()
        logger.info("Open-Meteo pipeline job completed successfully.")
    except Exception as exc:
        logger.error("Open-Meteo pipeline job failed with error: %s", exc, exc_info=True)

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    logger.info("=== Open-Meteo Marine/Risk Pipeline Job END (%.1fs) ===", elapsed)


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------

def run_daemon(interval_hours: int = DEFAULT_INTERVAL_HOURS) -> None:
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
        func=run_pipeline_job,
        trigger="interval",
        hours=interval_hours,
        id="open_meteo_pipeline",
        name=f"Open-Meteo Marine/Risk Pipeline — every {interval_hours}h",
        replace_existing=True,
        # Run once immediately at startup, then on the interval
        next_run_time=datetime.now(timezone.utc),
    )

    logger.info(
        "Open-Meteo Scheduler started. Interval: every %dh | Next run: now",
        interval_hours,
    )
    logger.info("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Open-Meteo Scheduler stopped.")
        scheduler.shutdown()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Open-Meteo Marine / Risk Pipeline Automated Scheduler",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once immediately and exit (no scheduling).",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL_HOURS,
        help=f"Interval in hours between pipeline runs (default: {DEFAULT_INTERVAL_HOURS}).",
    )

    args = parser.parse_args()

    if args.once:
        logger.info("Running single Open-Meteo pipeline execution …")
        run_pipeline_job()
    else:
        run_daemon(interval_hours=args.interval)


if __name__ == "__main__":
    main()
