"""
Module 6 — Current Environmental State Aggregator (Read Model).

This module is STRICTLY READ-ONLY. It performs NO INSERTs, UPDATEs, or DELETEs.

It aggregates the latest independently stored PFZ and Risk results, anchored to
the canonical 25 Karnataka sampling locations, and produces a unified read model
for downstream consumers (Maps, API layer, etc.).

KEY ARCHITECTURAL NOTES:
- PFZ and Risk timestamps remain INDEPENDENT. They are never synchronised.
- Canonical location list always drives the output (25 locations guaranteed).
- Missing results are represented as None — never as zero or a fabricated value.
- Freshness thresholds (PFZ_STALE_HOURS, RISK_STALE_HOURS) are configurable and
  affect only the status metadata field; they NEVER alter scores or confidence.

PFZ AGE CALCULATION LIMITATION:
  The pfz_results schema stores only an ``observation_date`` (``date`` type).
  There is no source-level timestamp column available in the current schema.
  Therefore PFZ age is calculated using the START of the observation_date day
  (midnight UTC) as a CONSERVATIVE FLOOR. This means the reported age is the
  MAXIMUM possible age for that date — the actual GEE source image may have been
  acquired later in the day, making the true age somewhat smaller.

  We deliberately do NOT assume midnight is the actual acquisition time; the age
  figure is labelled accordingly. A future schema migration adding a
  ``source_timestamp`` column to pfz_results would allow exact freshness.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from analytics.config import CANONICAL_CITY_NAMES
from analytics.persistence.models import PfzResult, RiskResult, SamplingLocation
from analytics.persistence.repository import PfzRepository, RiskRepository

# ---------------------------------------------------------------------------
# Freshness status constants
# ---------------------------------------------------------------------------

STATUS_CURRENT = "CURRENT"
STATUS_STALE = "STALE"
STATUS_MISSING = "MISSING"

# ---------------------------------------------------------------------------
# Configurable freshness thresholds
# These ONLY affect the status metadata field; they never alter scores.
# ---------------------------------------------------------------------------

_DEFAULT_PFZ_STALE_HOURS: float = float(
    os.getenv("MATSYAMITRA_PFZ_STALE_HOURS", "96")
)
_DEFAULT_RISK_STALE_HOURS: float = float(
    os.getenv("MATSYAMITRA_RISK_STALE_HOURS", "2")
)


@dataclass(frozen=True)
class FreshnessConfig:
    """Configurable freshness thresholds for the current-state read model.

    These thresholds determine CURRENT / STALE status only.
    They must never modify PFZ scores, Risk scores, or confidence values.
    """

    pfz_stale_hours: float = _DEFAULT_PFZ_STALE_HOURS
    risk_stale_hours: float = _DEFAULT_RISK_STALE_HOURS


DEFAULT_FRESHNESS_CONFIG = FreshnessConfig()


# ---------------------------------------------------------------------------
# Output read models
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PfzState:
    """Read model for the latest PFZ result at a canonical location.

    ``observation_date`` is preserved as a ``date`` — it is NOT converted to a
    fake ``datetime``.

    ``age_hours`` is calculated from midnight UTC of ``observation_date`` as a
    CONSERVATIVE FLOOR (see module docstring for limitation note).
    """

    score: Optional[float]
    category: str
    confidence: float
    observation_date: date
    source: str
    age_hours: float
    """
    Age in hours since midnight UTC of observation_date.
    This is a CONSERVATIVE FLOOR — actual source image may be newer within the day.
    Schema limitation: pfz_results has no source_timestamp column.
    """
    status: str  # CURRENT | STALE | MISSING — never affects scoring


@dataclass(frozen=True)
class RiskState:
    """Read model for the latest Risk result at a canonical location."""

    score: Optional[float]
    category: str
    confidence: float
    observation_timestamp: datetime
    source: str
    age_hours: float
    status: str  # CURRENT | STALE | MISSING — never affects scoring
    wind_speed: Optional[float] = None
    wave_height: Optional[float] = None


@dataclass(frozen=True)
class CurrentLocationEnvironmentalState:
    """Combined read model for a single canonical sampling location.

    Both ``pfz`` and ``risk`` may be None independently — never fabricated.
    Their timestamps remain independent of each other.
    """

    sampling_location_id: int
    location_id: str
    city_name: str
    latitude: float
    longitude: float
    pfz: Optional[PfzState]
    risk: Optional[RiskState]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _pfz_age_hours(observation_date: date, now: datetime) -> float:
    """Compute PFZ age from midnight UTC of observation_date.

    Returns a CONSERVATIVE FLOOR — the actual GEE acquisition may be later in
    the day, so the true age could be smaller. The schema does not store an
    exact source timestamp; see module docstring.
    """
    day_start_utc = datetime(
        observation_date.year,
        observation_date.month,
        observation_date.day,
        0, 0, 0,
        tzinfo=timezone.utc,
    )
    delta = now - day_start_utc
    return max(0.0, delta.total_seconds() / 3600.0)


def _risk_age_hours(observation_timestamp: datetime, now: datetime) -> float:
    """Compute Risk age from exact observation timestamp."""
    ts = observation_timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    delta = now - ts
    return max(0.0, delta.total_seconds() / 3600.0)


def _pfz_status(age_hours: float, cfg: FreshnessConfig) -> str:
    return STATUS_CURRENT if age_hours <= cfg.pfz_stale_hours else STATUS_STALE


def _risk_status(age_hours: float, cfg: FreshnessConfig) -> str:
    return STATUS_CURRENT if age_hours <= cfg.risk_stale_hours else STATUS_STALE


def _build_pfz_state(
    pfz: PfzResult,
    now: datetime,
    cfg: FreshnessConfig,
) -> PfzState:
    age = _pfz_age_hours(pfz.observation_date, now)
    return PfzState(
        score=pfz.pfz_score,
        category=pfz.pfz_category,
        confidence=pfz.confidence_score,
        observation_date=pfz.observation_date,
        source=pfz.source,
        age_hours=age,
        status=_pfz_status(age, cfg),
    )


def _build_risk_state(
    risk: RiskResult,
    now: datetime,
    cfg: FreshnessConfig,
) -> RiskState:
    age = _risk_age_hours(risk.observation_timestamp, now)
    ts = risk.observation_timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return RiskState(
        score=risk.risk_score,
        category=risk.risk_category,
        confidence=risk.confidence_score,
        observation_timestamp=ts,
        source=risk.source,
        age_hours=age,
        status=_risk_status(age, cfg),
        wind_speed=risk.wind_speed,
        wave_height=risk.wave_height,
    )


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def get_current_environmental_state(
    session: Session,
    freshness_config: FreshnessConfig = DEFAULT_FRESHNESS_CONFIG,
) -> list[CurrentLocationEnvironmentalState]:
    """Return the current environmental state for all active canonical locations.

    - Always begins from the canonical ``sampling_locations`` table.
    - Returns exactly one record per active location (25 in production).
    - Missing PFZ or Risk result → ``None`` (never fabricated).
    - PFZ and Risk timestamps remain INDEPENDENT.
    - This function is READ-ONLY — no data is modified.
    """
    now = _utc_now()

    # 1. Load all active canonical locations
    locations: list[SamplingLocation] = list(
        session.scalars(
            select(SamplingLocation)
            .where(SamplingLocation.is_active.is_(True))
            .order_by(SamplingLocation.location_id)
        ).all()
    )

    # 2. Fetch latest PFZ and Risk results via existing repositories
    pfz_repo = PfzRepository(session)
    risk_repo = RiskRepository(session)

    latest_pfz: list[PfzResult] = pfz_repo.get_latest_pfz_results()
    latest_risk: list[RiskResult] = risk_repo.get_latest_risk_results()

    # 3. Build lookup dicts keyed by sampling_location_id
    pfz_by_loc: dict[int, PfzResult] = {p.sampling_location_id: p for p in latest_pfz}
    risk_by_loc: dict[int, RiskResult] = {r.sampling_location_id: r for r in latest_risk}

    # 4. Join in application code — anchored to canonical locations
    results: list[CurrentLocationEnvironmentalState] = []
    for loc in locations:
        pfz_row = pfz_by_loc.get(loc.id)
        risk_row = risk_by_loc.get(loc.id)
        city_name = getattr(loc, "city_name", None) or CANONICAL_CITY_NAMES.get(loc.location_id, loc.location_id)

        results.append(
            CurrentLocationEnvironmentalState(
                sampling_location_id=loc.id,
                location_id=loc.location_id,
                city_name=city_name,
                latitude=loc.latitude,
                longitude=loc.longitude,
                pfz=_build_pfz_state(pfz_row, now, freshness_config) if pfz_row else None,
                risk=_build_risk_state(risk_row, now, freshness_config) if risk_row else None,
            )
        )

    return results


def get_current_environmental_state_for_location(
    session: Session,
    location_id: str,
    freshness_config: FreshnessConfig = DEFAULT_FRESHNESS_CONFIG,
) -> Optional[CurrentLocationEnvironmentalState]:
    """Return the current environmental state for a single canonical location.

    Returns ``None`` if the location_id does not exist or is inactive.
    This function is READ-ONLY — no data is modified.
    """
    now = _utc_now()

    loc: Optional[SamplingLocation] = session.scalar(
        select(SamplingLocation).where(
            SamplingLocation.location_id == location_id,
            SamplingLocation.is_active.is_(True),
        )
    )
    if loc is None:
        return None

    pfz_repo = PfzRepository(session)
    risk_repo = RiskRepository(session)

    pfz_row: Optional[PfzResult] = pfz_repo.get_latest_pfz_result_for_location(loc.id)
    risk_row: Optional[RiskResult] = risk_repo.get_latest_risk_result_for_location(loc.id)
    city_name = getattr(loc, "city_name", None) or CANONICAL_CITY_NAMES.get(loc.location_id, loc.location_id)

    return CurrentLocationEnvironmentalState(
        sampling_location_id=loc.id,
        location_id=loc.location_id,
        city_name=city_name,
        latitude=loc.latitude,
        longitude=loc.longitude,
        pfz=_build_pfz_state(pfz_row, now, freshness_config) if pfz_row else None,
        risk=_build_risk_state(risk_row, now, freshness_config) if risk_row else None,
    )
