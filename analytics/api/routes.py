"""FastAPI Routes for MatsyaMitra API v1."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from analytics.api.schemas import (
    AlertOut,
    CurrentStateOut,
    HealthResponse,
    IncoisAdvisoryOut,
    PfzStateOut,
    RiskStateOut,
)
from analytics.config import CANONICAL_CITY_NAMES
from analytics.current_state import (
    CurrentLocationEnvironmentalState,
    get_current_environmental_state,
    get_current_environmental_state_for_location,
)
from analytics.incois.repository import IncoisAdvisoryRepository
from analytics.persistence.database import create_database_engine
from analytics.persistence.models import IncoisAdvisory, SamplingLocation
from analytics.scheduler import get_scheduler_status, trigger_pipeline_job

logger = logging.getLogger("matsyamitra_api")

router = APIRouter(prefix="/api/v1", tags=["v1"])

# Lazy engine initialization to allow graceful operation and tests
_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_database_engine()
    return _engine


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI Dependency for database sessions."""
    try:
        engine = get_engine()
        with Session(engine) as session:
            yield session
    except Exception as exc:
        logger.error("Failed to establish database session: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {str(exc)}",
        )


@router.get("/health", response_model=HealthResponse)
def get_health(session: Optional[Session] = Depends(get_db_session)) -> HealthResponse:
    """Check API server health and database connectivity."""
    db_status = "disconnected"
    db_dialect = None

    try:
        if session is not None:
            session.execute(text("SELECT 1"))
            db_status = "connected"
            bind = session.get_bind()
            if bind is not None:
                db_dialect = bind.dialect.name
    except Exception as exc:
        logger.warning("Health check DB probe failed: %s", exc)
        db_status = f"disconnected ({type(exc).__name__})"

    is_healthy = db_status == "connected"
    return HealthResponse(
        status="ok" if is_healthy else "degraded",
        database_status=db_status,
        database_type=db_dialect,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/current-state", response_model=list[CurrentStateOut])
def get_all_current_states(session: Session = Depends(get_db_session)) -> list[CurrentStateOut]:
    """
    Return the current environmental state for all 25 active canonical sampling locations.

    Anchored to canonical locations. PFZ and Risk timestamps remain strictly independent.
    """
    try:
        states: list[CurrentLocationEnvironmentalState] = get_current_environmental_state(session)
        return [
            CurrentStateOut(
                sampling_location_id=s.sampling_location_id,
                location_id=s.location_id,
                city_name=s.city_name,
                latitude=s.latitude,
                longitude=s.longitude,
                pfz=PfzStateOut(
                    score=s.pfz.score,
                    category=s.pfz.category,
                    confidence=s.pfz.confidence,
                    observation_date=s.pfz.observation_date,
                    source=s.pfz.source,
                    age_hours=s.pfz.age_hours,
                    status=s.pfz.status,
                    sst=s.pfz.sst,
                    chlorophyll=s.pfz.chlorophyll,
                ) if s.pfz else None,
                risk=RiskStateOut(
                    score=s.risk.score,
                    category=s.risk.category,
                    confidence=s.risk.confidence,
                    observation_timestamp=s.risk.observation_timestamp,
                    source=s.risk.source,
                    age_hours=s.risk.age_hours,
                    status=s.risk.status,
                    wind_speed=s.risk.wind_speed,
                    wave_height=s.risk.wave_height,
                ) if s.risk else None,
            )
            for s in states
        ]
    except Exception as exc:
        logger.error("Error fetching current environmental state: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate current state: {str(exc)}",
        )


@router.get("/current-state/{location_id}", response_model=CurrentStateOut)
def get_current_state_by_location(
    location_id: str,
    session: Session = Depends(get_db_session),
) -> CurrentStateOut:
    """Return the current environmental state for a single canonical location (e.g. KARN_001)."""
    state: Optional[CurrentLocationEnvironmentalState] = get_current_environmental_state_for_location(
        session, location_id.strip()
    )
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sampling location '{location_id}' not found or inactive.",
        )

    return CurrentStateOut(
        sampling_location_id=state.sampling_location_id,
        location_id=state.location_id,
        city_name=state.city_name,
        latitude=state.latitude,
        longitude=state.longitude,
        pfz=PfzStateOut(
            score=state.pfz.score,
            category=state.pfz.category,
            confidence=state.pfz.confidence,
            observation_date=state.pfz.observation_date,
            source=state.pfz.source,
            age_hours=state.pfz.age_hours,
            status=state.pfz.status,
            sst=state.pfz.sst,
            chlorophyll=state.pfz.chlorophyll,
        ) if state.pfz else None,
        risk=RiskStateOut(
            score=state.risk.score,
            category=state.risk.category,
            confidence=state.risk.confidence,
            observation_timestamp=state.risk.observation_timestamp,
            source=state.risk.source,
            age_hours=state.risk.age_hours,
            status=state.risk.status,
            wind_speed=state.risk.wind_speed,
            wave_height=state.risk.wave_height,
        ) if state.risk else None,
    )


@router.get("/advisories", response_model=list[IncoisAdvisoryOut])
def get_advisories(
    landing: Optional[str] = Query(None, description="Optional landing center name to filter by substring"),
    advisory_date: Optional[str] = Query(None, description="Optional specific advisory date (YYYY-MM-DD)"),
    session: Session = Depends(get_db_session),
) -> list[IncoisAdvisoryOut]:
    """Return INCOIS PFZ advisories for the latest available date (or specified date)."""
    repo = IncoisAdvisoryRepository(session)

    target_date = None
    if advisory_date:
        try:
            target_date = datetime.strptime(advisory_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD.",
            )
    else:
        target_date = repo.get_latest_advisory_date()

    if target_date is None:
        return []

    rows: list[IncoisAdvisory] = repo.get_advisories_for_date(target_date)

    if landing:
        term = landing.strip().lower()
        rows = [r for r in rows if term in (r.landing_center or "").lower()]

    locs_by_id = {
        loc.id: getattr(loc, "city_name", None) or CANONICAL_CITY_NAMES.get(loc.location_id, loc.location_id)
        for loc in session.scalars(select(SamplingLocation)).all()
    }

    return [
        IncoisAdvisoryOut(
            id=r.id,
            advisory_date=r.advisory_date,
            sector_id=r.sector_id,
            landing_center=r.landing_center,
            city_name=locs_by_id.get(r.nearest_sampling_location_id) or r.landing_center,
            bearing_degrees=r.bearing_degrees,
            distance_km=r.distance_km,
            depth_m=r.depth_m,
            latitude=r.latitude,
            longitude=r.longitude,
            raw_text=r.raw_text,
            nearest_sampling_location_id=r.nearest_sampling_location_id,
            distance_to_nearest_km=r.distance_to_nearest_km,
        )
        for r in rows
    ]


@router.get("/alerts", response_model=list[AlertOut])
def get_alerts(session: Session = Depends(get_db_session)) -> list[AlertOut]:
    """
    Combine active marine risk alerts with recent INCOIS advisories.

    Builds alerts directly from database records without fabricating data.
    """
    alerts: list[AlertOut] = []

    # 1. Marine Risk Alerts (from current environmental state across 25 locations)
    try:
        states = get_current_environmental_state(session)
        for s in states:
            if s.risk and s.risk.score is not None:
                cat = (s.risk.category or "").strip()
                city_label = s.city_name or s.location_id
                if cat in ("High Risk", "Extreme Risk"):
                    alerts.append(
                        AlertOut(
                            id=f"risk-{s.location_id}-{int(s.risk.observation_timestamp.timestamp())}",
                            severity="urgent",
                            badge_label="HIGH RISK",
                            title=f"Rough Sea Advisory: {city_label}",
                            body=(
                                f"Operational Marine Risk is high (score: {s.risk.score:.1f}/10 - {cat}). "
                                f"High wind or wave hazards detected near {city_label} ({s.latitude:.2f}°N, {s.longitude:.2f}°E)."
                            ),
                            source="Open-Meteo Marine Risk",
                            timestamp=s.risk.observation_timestamp.strftime("%Y-%m-%d %H:%M UTC"),
                            icon="alert-circle",
                            category="weather",
                            location_id=s.location_id,
                            city_name=s.city_name,
                            latitude=s.latitude,
                            longitude=s.longitude,
                        )
                    )
                elif cat == "Moderate Risk":
                    alerts.append(
                        AlertOut(
                            id=f"risk-{s.location_id}-{int(s.risk.observation_timestamp.timestamp())}",
                            severity="caution",
                            badge_label="CAUTION",
                            title=f"Moderate Swell Advisory: {city_label}",
                            body=(
                                f"Moderate Marine Risk observed (score: {s.risk.score:.1f}/10). "
                                f"Caution advised for small craft operating near {city_label} ({s.latitude:.2f}°N, {s.longitude:.2f}°E)."
                            ),
                            source="Open-Meteo Marine Risk",
                            timestamp=s.risk.observation_timestamp.strftime("%Y-%m-%d %H:%M UTC"),
                            icon="alert-outline",
                            category="weather",
                            location_id=s.location_id,
                            city_name=s.city_name,
                            latitude=s.latitude,
                            longitude=s.longitude,
                        )
                    )
    except Exception as exc:
        logger.warning("Could not aggregate marine risk alerts: %s", exc)

    # 2. INCOIS PFZ Advisories
    try:
        incois_repo = IncoisAdvisoryRepository(session)
        latest_date = incois_repo.get_latest_advisory_date()
        if latest_date:
            locs_by_id = {
                loc.id: getattr(loc, "city_name", None) or CANONICAL_CITY_NAMES.get(loc.location_id, loc.location_id)
                for loc in session.scalars(select(SamplingLocation)).all()
            }
            advisories = incois_repo.get_advisories_for_date(latest_date)
            for adv in advisories:
                distance_str = f"{adv.distance_km:.1f} km" if adv.distance_km else "N/A"
                bearing_str = f"{adv.bearing_degrees:.0f}°" if adv.bearing_degrees else "N/A"
                depth_str = f"{adv.depth_m:.0f} m" if adv.depth_m else "N/A"
                city_label = locs_by_id.get(adv.nearest_sampling_location_id) or adv.landing_center

                alerts.append(
                    AlertOut(
                        id=f"incois-{adv.id}-{adv.advisory_date.isoformat()}",
                        severity="info",
                        badge_label="PFZ ADVISORY",
                        title=f"Potential Fishing Zone: {city_label}",
                        body=(
                            f"INCOIS bulletin announces PFZ near {city_label} ({adv.latitude:.2f}°N, {adv.longitude:.2f}°E) "
                            f"at distance {distance_str}, bearing {bearing_str}, depth {depth_str}."
                        ),
                        source="INCOIS",
                        timestamp=adv.advisory_date.isoformat(),
                        icon="fish",
                        category="advisory",
                        location_id=None,
                        city_name=city_label,
                        latitude=adv.latitude,
                        longitude=adv.longitude,
                    )
                )
    except Exception as exc:
        logger.warning("Could not aggregate INCOIS alerts: %s", exc)

    return alerts


@router.get("/pipeline/status")
def get_pipeline_status():
    """Return runtime metadata and next scheduled execution times for all data pipelines."""
    return get_scheduler_status()


@router.post("/pipeline/trigger")
def trigger_pipeline(job: str = Query("all", description="Pipeline to trigger: incois, open_meteo, or all")):
    """Trigger an asynchronous execution of a pipeline job in the background."""
    return trigger_pipeline_job(job)
