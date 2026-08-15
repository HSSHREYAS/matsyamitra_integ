"""Local viewer for INCOIS scraped advisories.

Creates a local SQLite DB (if needed), runs the INCOIS pipeline once using
the provided test HTML, and exposes a tiny FastAPI server to inspect
inserted advisory rows.

Usage:
  python -m pip install fastapi uvicorn
  python analytics/local_viewer.py

Open http://127.0.0.1:8000/advisories in your browser.
"""

from __future__ import annotations

import os
from datetime import date
import logging

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from sqlalchemy.orm import Session

from analytics.persistence.database import create_database_engine, create_tables
from analytics.incois.pipeline import run_incois_pipeline, DEFAULT_SECTOR_ID
from analytics.incois.repository import IncoisAdvisoryRepository

try:
    # Import sample HTML from the tests module
    from analytics.incois.tests import MOCK_LIVE_ADVISORY_HTML
except Exception:
    MOCK_LIVE_ADVISORY_HTML = None

DEFAULT_DB_URL = os.getenv("MATSYAMITRA_DATABASE_URL", "sqlite:///./local_matsyamitra.db")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("local_viewer")


class AdvisoryOut(BaseModel):
    id: int
    advisory_date: date
    sector_id: str
    landing_center: str
    bearing_degrees: float | None
    distance_km: float | None
    depth_m: float | None
    latitude: float
    longitude: float
    raw_text: str | None


def _ensure_db() -> tuple:
    """Create engine and persistence tables if they don't exist."""
    os.environ.setdefault("MATSYAMITRA_DATABASE_URL", DEFAULT_DB_URL)
    engine = create_database_engine()
    create_tables(engine)
    return engine


app = FastAPI(title="MatsyaMitra — Local INCOIS Viewer")


@app.on_event("startup")
def startup_populate_once() -> None:
    """Populate the DB once on startup if it's empty."""
    engine = _ensure_db()
    from analytics.persistence.models import IncoisAdvisory

    with Session(engine) as session:
        repo = IncoisAdvisoryRepository(session)
        latest = repo.get_latest_advisory_date()
        if latest is not None:
            logger.info("Database already has advisories for %s — skipping populate.", latest)
            return

        if MOCK_LIVE_ADVISORY_HTML is None:
            logger.warning("No sample HTML available — populate endpoint will be disabled.")
            return

        logger.info("Populating DB using sample INCOIS advisory HTML...")
        result = run_incois_pipeline(session=session, sector_id=DEFAULT_SECTOR_ID, html_override=MOCK_LIVE_ADVISORY_HTML)
        session.commit()
        logger.info("Populate finished: inserted=%d skipped=%d parsed=%d", result.records_inserted, result.records_skipped, result.records_parsed)


@app.get("/advisories", response_model=list[AdvisoryOut])
def get_advisories(landing: str | None = Query(None, description="Optional landing center name to filter")):
    """Return latest advisories, optionally filtered by `landing` (case-insensitive substring match)."""
    engine = _ensure_db()
    with Session(engine) as session:
        repo = IncoisAdvisoryRepository(session)
        latest = repo.get_latest_advisory_date()
        if latest is None:
            raise HTTPException(status_code=404, detail="No advisories found. Call /populate or start the pipeline first.")
        rows = repo.get_advisories_for_date(latest)
        if landing:
            term = landing.strip().lower()
            rows = [r for r in rows if term in (r.landing_center or "").lower()]
        return [
            AdvisoryOut(
                id=r.id,
                advisory_date=r.advisory_date,
                sector_id=r.sector_id,
                landing_center=r.landing_center,
                bearing_degrees=r.bearing_degrees,
                distance_km=r.distance_km,
                depth_m=r.depth_m,
                latitude=r.latitude,
                longitude=r.longitude,
                raw_text=r.raw_text,
            )
            for r in rows
        ]


@app.post("/populate")
def populate_once():
    """Manually trigger a pipeline run using the sample HTML override."""
    if MOCK_LIVE_ADVISORY_HTML is None:
        raise HTTPException(status_code=500, detail="Sample HTML not available in this environment.")

    engine = _ensure_db()
    with Session(engine) as session:
        result = run_incois_pipeline(session=session, sector_id=DEFAULT_SECTOR_ID, html_override=MOCK_LIVE_ADVISORY_HTML)
        session.commit()
        return {
            "inserted": result.records_inserted,
            "skipped": result.records_skipped,
            "parsed": result.records_parsed,
            "no_advisory": result.no_advisory_today,
            "errors": result.errors,
        }


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting local viewer on http://127.0.0.1:8000 — DB=%s", DEFAULT_DB_URL)
    uvicorn.run(app, host="127.0.0.1", port=8000)
