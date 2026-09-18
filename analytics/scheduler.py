"""
Automated Background Scheduler for MatsyaMitra Backend.

Uses APScheduler to periodically run:
1. INCOIS Advisory Scraping & Vector Calculation (every 12 hours)
2. Open-Meteo Marine Weather & Risk Scoring (every 6 hours)

Embedded directly into FastAPI lifecycle without needing external crons.
"""

from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger("matsyamitra_scheduler")

_scheduler: Optional[BackgroundScheduler] = None
_job_history: Dict[str, Dict[str, Any]] = {}


def _run_incois_job() -> None:
    """Run INCOIS advisory scraper job with error isolation."""
    job_id = "incois_sync"
    start_time = datetime.now(timezone.utc)
    _job_history[job_id] = {
        "status": "running",
        "last_started_at": start_time.isoformat(),
        "last_error": None,
    }
    logger.info("=== [Scheduler] INCOIS Advisory Sync START (%s UTC) ===", start_time.strftime("%H:%M:%S"))

    try:
        from analytics.incois_scheduler import run_scrape_job
        run_scrape_job()
        _job_history[job_id]["status"] = "success"
        _job_history[job_id]["last_completed_at"] = datetime.now(timezone.utc).isoformat()
        logger.info("=== [Scheduler] INCOIS Advisory Sync SUCCESS ===")
    except Exception as exc:
        _job_history[job_id]["status"] = "failed"
        _job_history[job_id]["last_error"] = str(exc)
        logger.error("=== [Scheduler] INCOIS Advisory Sync FAILED: %s ===", exc, exc_info=True)


def _run_open_meteo_job() -> None:
    """Run Open-Meteo marine telemetry and risk calculation job."""
    job_id = "open_meteo_sync"
    start_time = datetime.now(timezone.utc)
    _job_history[job_id] = {
        "status": "running",
        "last_started_at": start_time.isoformat(),
        "last_error": None,
    }
    logger.info("=== [Scheduler] Open-Meteo Risk Sync START (%s UTC) ===", start_time.strftime("%H:%M:%S"))

    try:
        from analytics.open_meteo_scheduler import run_pipeline_job
        run_pipeline_job()
        _job_history[job_id]["status"] = "success"
        _job_history[job_id]["last_completed_at"] = datetime.now(timezone.utc).isoformat()
        logger.info("=== [Scheduler] Open-Meteo Risk Sync SUCCESS ===")
    except Exception as exc:
        _job_history[job_id]["status"] = "failed"
        _job_history[job_id]["last_error"] = str(exc)
        logger.error("=== [Scheduler] Open-Meteo Risk Sync FAILED: %s ===", exc, exc_info=True)


def _run_gee_job() -> None:
    """Run Google Earth Engine SST & Chlorophyll extraction + PFZ scoring job."""
    job_id = "gee_sync"
    start_time = datetime.now(timezone.utc)
    _job_history[job_id] = {
        "status": "running",
        "last_started_at": start_time.isoformat(),
        "last_error": None,
    }
    logger.info("=== [Scheduler] Google Earth Engine Sync START (%s UTC) ===", start_time.strftime("%H:%M:%S"))

    try:
        from analytics.live_gee_pipeline import run_live_gee_pfz_pipeline
        run_live_gee_pfz_pipeline()
        _job_history[job_id]["status"] = "success"
        _job_history[job_id]["last_completed_at"] = datetime.now(timezone.utc).isoformat()
        logger.info("=== [Scheduler] Google Earth Engine Sync SUCCESS ===")
    except Exception as exc:
        _job_history[job_id]["status"] = "failed"
        _job_history[job_id]["last_error"] = str(exc)
        logger.error("=== [Scheduler] Google Earth Engine Sync FAILED: %s ===", exc, exc_info=True)


def start_scheduler() -> BackgroundScheduler:
    """Initialize and start the background scheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.info("Scheduler already running.")
        return _scheduler

    incois_interval = int(os.getenv("INCOIS_SYNC_INTERVAL_HOURS", "12"))
    open_meteo_interval = int(os.getenv("OPEN_METEO_SYNC_INTERVAL_HOURS", "6"))
    gee_interval = int(os.getenv("GEE_SYNC_INTERVAL_HOURS", "24"))

    _scheduler = BackgroundScheduler(timezone="UTC")

    # 1. INCOIS Advisory sync
    _scheduler.add_job(
        func=_run_incois_job,
        trigger=IntervalTrigger(hours=incois_interval),
        id="incois_sync",
        name=f"INCOIS PFZ Ingestion ({incois_interval}h)",
        replace_existing=True,
    )

    # 2. Open-Meteo Marine Risk sync
    _scheduler.add_job(
        func=_run_open_meteo_job,
        trigger=IntervalTrigger(hours=open_meteo_interval),
        id="open_meteo_sync",
        name=f"Open-Meteo Risk Calculation ({open_meteo_interval}h)",
        replace_existing=True,
    )

    # 3. Google Earth Engine SST & Chlorophyll sync
    _scheduler.add_job(
        func=_run_gee_job,
        trigger=IntervalTrigger(hours=gee_interval),
        id="gee_sync",
        name=f"Google Earth Engine SST & Chl ({gee_interval}h)",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("MatsyaMitra APScheduler started with 3 background pipelines.")
    return _scheduler


def stop_scheduler() -> None:
    """Stop the background scheduler gracefully."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("MatsyaMitra APScheduler stopped.")
        _scheduler = None


def get_scheduler_status() -> Dict[str, Any]:
    """Return runtime metadata and next run times for all scheduled jobs."""
    is_running = _scheduler is not None and _scheduler.running
    jobs_info: List[Dict[str, Any]] = []

    if is_running and _scheduler is not None:
        for job in _scheduler.get_jobs():
            history = _job_history.get(job.id, {})
            jobs_info.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                "status": history.get("status", "idle"),
                "last_started_at": history.get("last_started_at"),
                "last_completed_at": history.get("last_completed_at"),
                "last_error": history.get("last_error"),
            })

    return {
        "scheduler_running": is_running,
        "jobs": jobs_info,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def trigger_pipeline_job(job_name: str) -> Dict[str, Any]:
    """
    Trigger a pipeline job asynchronously in a background thread.
    Supported job_name: 'incois', 'open_meteo', 'gee', 'all'.
    """
    target = job_name.lower().strip()

    if target in ("incois", "incois_sync"):
        thread = threading.Thread(target=_run_incois_job, daemon=True)
        thread.start()
        return {"status": "triggered", "job": "incois_sync", "message": "INCOIS sync triggered in background thread"}

    elif target in ("open_meteo", "open_meteo_sync", "marine"):
        thread = threading.Thread(target=_run_open_meteo_job, daemon=True)
        thread.start()
        return {"status": "triggered", "job": "open_meteo_sync", "message": "Open-Meteo risk sync triggered in background thread"}

    elif target in ("gee", "gee_sync", "earthengine", "pfz"):
        thread = threading.Thread(target=_run_gee_job, daemon=True)
        thread.start()
        return {"status": "triggered", "job": "gee_sync", "message": "Google Earth Engine sync triggered in background thread"}

    elif target in ("all", "both"):
        t1 = threading.Thread(target=_run_incois_job, daemon=True)
        t2 = threading.Thread(target=_run_open_meteo_job, daemon=True)
        t3 = threading.Thread(target=_run_gee_job, daemon=True)
        t1.start()
        t2.start()
        t3.start()
        return {"status": "triggered", "job": "all", "message": "INCOIS, Open-Meteo, and GEE sync triggered in background threads"}

    else:
        return {"status": "error", "message": f"Unknown job '{job_name}'. Valid options: incois, open_meteo, gee, all"}
