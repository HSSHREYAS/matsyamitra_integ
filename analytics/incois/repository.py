"""
INCOIS Advisory Database Repository.

Handles all database read and write operations for the incois_advisories table.
Follows the same patterns as PfzRepository and RiskRepository in the project.

Duplicate policy: SKIP — if a record with the same advisory_date + latitude +
longitude already exists, it is silently skipped (idempotent ingestion).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from analytics.persistence.models import IncoisAdvisory, SamplingLocation

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class IncoisAdvisoryRepository:
    """
    Repository for INCOIS PFZ text advisory records.

    All operations use the provided SQLAlchemy Session. Callers are responsible
    for commit / rollback.
    """

    def __init__(self, session: Session) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def insert_advisory(
        self,
        advisory_date: date,
        sector_id: str,
        landing_center: str,
        bearing_degrees: Optional[float],
        distance_km: Optional[float],
        depth_m: Optional[float],
        latitude: float,
        longitude: float,
        raw_text: Optional[str] = None,
        nearest_sampling_location_id: Optional[int] = None,
        distance_to_nearest_km: Optional[float] = None,
    ) -> Optional[IncoisAdvisory]:
        """
        Insert one advisory record. Returns the inserted row, or None if
        a duplicate already exists (skip policy).
        """
        # Check for duplicate: same date + lat + lon (rounded to 4dp)
        existing = self.session.scalar(
            select(IncoisAdvisory).where(
                IncoisAdvisory.advisory_date == advisory_date,
                IncoisAdvisory.latitude == round(latitude, 4),
                IncoisAdvisory.longitude == round(longitude, 4),
            )
        )
        if existing is not None:
            logger.debug(
                "Skipping duplicate advisory: date=%s lat=%.4f lon=%.4f",
                advisory_date,
                latitude,
                longitude,
            )
            return None

        row = IncoisAdvisory(
            advisory_date=advisory_date,
            sector_id=sector_id,
            landing_center=landing_center,
            bearing_degrees=bearing_degrees,
            distance_km=distance_km,
            depth_m=depth_m,
            latitude=round(latitude, 4),
            longitude=round(longitude, 4),
            raw_text=raw_text,
            scraped_at=_utc_now(),
            nearest_sampling_location_id=nearest_sampling_location_id,
            distance_to_nearest_km=distance_to_nearest_km,
            created_at=_utc_now(),
        )
        try:
            self.session.add(row)
            self.session.flush()
            logger.debug(
                "Inserted INCOIS advisory: date=%s landing=%s (%.4f, %.4f)",
                advisory_date,
                landing_center,
                latitude,
                longitude,
            )
            return row
        except IntegrityError:
            self.session.rollback()
            logger.debug("Integrity error on insert — duplicate record, skipping.")
            return None
        except SQLAlchemyError as exc:
            self.session.rollback()
            logger.error("Failed to insert INCOIS advisory: %s", exc)
            raise

    def insert_many(
        self,
        records: list[dict],
    ) -> tuple[int, int]:
        """
        Insert multiple advisory records in a single transaction.

        Args:
            records: List of dicts with keys matching insert_advisory parameters.

        Returns:
            (inserted_count, skipped_count) tuple.
        """
        inserted = 0
        skipped = 0
        for rec in records:
            result = self.insert_advisory(**rec)
            if result is not None:
                inserted += 1
            else:
                skipped += 1
        return inserted, skipped

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    def get_advisories_for_date(self, advisory_date: date) -> list[IncoisAdvisory]:
        """Return all advisory records for a specific date."""
        return list(
            self.session.scalars(
                select(IncoisAdvisory)
                .where(IncoisAdvisory.advisory_date == advisory_date)
                .order_by(IncoisAdvisory.landing_center)
            ).all()
        )

    def get_latest_advisory_date(self) -> Optional[date]:
        """Return the most recent advisory date in the database."""
        from sqlalchemy import func
        return self.session.scalar(select(func.max(IncoisAdvisory.advisory_date)))

    def get_advisories_with_matched_locations(
        self,
        advisory_date: date,
    ) -> list[IncoisAdvisory]:
        """
        Return advisories for a date that have been spatially matched to a
        canonical sampling location.
        """
        return list(
            self.session.scalars(
                select(IncoisAdvisory)
                .where(
                    IncoisAdvisory.advisory_date == advisory_date,
                    IncoisAdvisory.nearest_sampling_location_id.is_not(None),
                )
                .order_by(IncoisAdvisory.nearest_sampling_location_id)
            ).all()
        )

    def get_latest_advisory_per_location(self) -> list[IncoisAdvisory]:
        """
        Return the most recent advisory record for each matched sampling location.
        Used by the pipeline to decide which locations have fresh INCOIS data.
        """
        from sqlalchemy import func

        subquery = (
            select(
                IncoisAdvisory.nearest_sampling_location_id,
                func.max(IncoisAdvisory.advisory_date).label("max_date"),
            )
            .where(IncoisAdvisory.nearest_sampling_location_id.is_not(None))
            .group_by(IncoisAdvisory.nearest_sampling_location_id)
            .subquery()
        )

        return list(
            self.session.scalars(
                select(IncoisAdvisory).join(
                    subquery,
                    (IncoisAdvisory.nearest_sampling_location_id == subquery.c.nearest_sampling_location_id)
                    & (IncoisAdvisory.advisory_date == subquery.c.max_date),
                )
            ).all()
        )

    def count_advisories_for_date(self, advisory_date: date) -> int:
        """Return the count of advisory records for a given date."""
        from sqlalchemy import func
        return int(
            self.session.scalar(
                select(func.count(IncoisAdvisory.id)).where(
                    IncoisAdvisory.advisory_date == advisory_date
                )
            ) or 0
        )

    def get_sampling_location_id(self, location_id: str) -> Optional[int]:
        """
        Look up the integer primary key of a sampling location by its
        string identifier (e.g. 'KARN_007').
        """
        return self.session.scalar(
            select(SamplingLocation.id).where(
                SamplingLocation.location_id == location_id
            )
        )
