from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from analytics.config import DEFAULT_PERSISTENCE_TABLE_NAMES


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class ExtractionRun(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.extraction_runs

    run_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    execution_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    requested_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    requested_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sample_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retained_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    execution_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="success", nullable=False)
    warnings: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    observations: Mapped[list["EnvironmentalObservation"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
    )


class SamplingLocation(Base):
    """Canonical 25 Karnataka coastal sampling locations (KARN_001 … KARN_025)."""

    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    environmental_observations: Mapped[list["EnvironmentalObservation"]] = relationship(
        back_populates="sampling_location",
    )
    marine_observations: Mapped[list["MarineObservation"]] = relationship(
        back_populates="sampling_location",
    )
    pfz_results: Mapped[list["PfzResult"]] = relationship(
        back_populates="sampling_location",
        cascade="all, delete-orphan",
    )
    risk_results: Mapped[list["RiskResult"]] = relationship(
        back_populates="sampling_location",
        cascade="all, delete-orphan",
    )


class EnvironmentalObservation(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.environmental_observations
    __table_args__ = (
        UniqueConstraint(
            "latitude",
            "longitude",
            "observation_date",
            name="uq_environmental_observation_location_date",
        ),
    )

    id: Mapped[int] = mapped_column("observation_id", Integer, primary_key=True, autoincrement=True)
    # Nullable FK — existing GEE observations (random sampling) will have NULL here.
    # Module 4 will populate this when GEE is migrated to canonical locations.
    sampling_location_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations}.id"),
        nullable=True,
        index=True,
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sst: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    chlorophyll: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )
    run_id: Mapped[str] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.extraction_runs}.run_id"),
        nullable=False,
    )

    run: Mapped[ExtractionRun] = relationship(back_populates="observations")
    sampling_location: Mapped["SamplingLocation | None"] = relationship(
        back_populates="environmental_observations",
    )
    analytics_results: Mapped[list["AnalyticsResult"]] = relationship(
        back_populates="observation",
        cascade="all, delete-orphan",
    )
    pfz_results: Mapped[list["PfzResult"]] = relationship(
        back_populates="environmental_observation",
    )


class DatasetMetadata(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.dataset_metadata

    parameter: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(64), nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    last_verified: Mapped[date | None] = mapped_column(Date, nullable=True)


class AnalyticsResult(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.analytics_results
    __table_args__ = (
        UniqueConstraint(
            "observation_id",
            "analytics_version",
            name="uq_analytics_result_observation_version",
        ),
    )

    analytics_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    observation_id: Mapped[int] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.environmental_observations}.observation_id"),
        nullable=False,
        index=True,
    )
    pfz_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pfz_category: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_label: Mapped[str] = mapped_column(String(64), nullable=False)
    explanation: Mapped[str] = mapped_column(String(2000), nullable=False)
    analytics_version: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    observation: Mapped[EnvironmentalObservation] = relationship(back_populates="analytics_results")


class MarineObservation(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.marine_observations
    __table_args__ = (
        UniqueConstraint(
            "location_id",
            "observation_timestamp",
            "source",
            name="uq_marine_observation_location_timestamp_source",
        ),
    )

    marine_observation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Nullable FK — backfilled from location_id by the Module 1 migration.
    sampling_location_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations}.id"),
        nullable=True,
        index=True,
    )
    location_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    observation_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    wind_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    sampling_location: Mapped["SamplingLocation | None"] = relationship(
        back_populates="marine_observations",
    )
    risk_results: Mapped[list["RiskResult"]] = relationship(
        back_populates="marine_observation",
    )


class IncoisAdvisory(Base):
    """
    Raw INCOIS PFZ text advisory record scraped from the Marine Fisheries portal.

    Each row represents one Potential Fishing Zone announced by INCOIS for a
    specific landing center on a given advisory date.

    Phase 1: Stores advisory zone data only (no SST/Chlorophyll).
    Phase 2 (future): Will be enriched with GEE environmental cross-reference.
    """

    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.incois_advisories
    __table_args__ = (
        UniqueConstraint(
            "advisory_date",
            "latitude",
            "longitude",
            name="uq_incois_advisory_date_lat_lon",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Advisory metadata
    advisory_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sector_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # Landing center and navigation data from the INCOIS text advisory
    landing_center: Mapped[str] = mapped_column(String(128), nullable=False)
    bearing_degrees: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    depth_m: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Zone coordinates
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    # Audit trail
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Spatial match to nearest canonical KARN_XXX sampling location
    nearest_sampling_location_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations}.id"),
        nullable=True,
        index=True,
    )
    distance_to_nearest_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationship to canonical location (optional — may be None if unmatched)
    nearest_sampling_location: Mapped["SamplingLocation | None"] = relationship(
        "SamplingLocation",
        foreign_keys=[nearest_sampling_location_id],
    )


class PfzResult(Base):
    """Potential Fishing Zone result derived from GEE SST and Chlorophyll."""

    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.pfz_results
    __table_args__ = (
        UniqueConstraint(
            "sampling_location_id",
            "observation_date",
            "analytics_version",
            name="uq_pfz_result_location_date_version",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sampling_location_id: Mapped[int] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations}.id"),
        nullable=False,
        index=True,
    )
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    environmental_observation_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.environmental_observations}.observation_id"),
        nullable=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="gee")
    sst: Mapped[float | None] = mapped_column(Float, nullable=True)
    chlorophyll: Mapped[float | None] = mapped_column(Float, nullable=True)
    pfz_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pfz_category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    analytics_version: Mapped[str] = mapped_column(String(64), nullable=False, default="deterministic-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    sampling_location: Mapped[SamplingLocation] = relationship(back_populates="pfz_results")
    environmental_observation: Mapped["EnvironmentalObservation | None"] = relationship(
        back_populates="pfz_results",
    )


class RiskResult(Base):
    """Operational Risk result derived from Open-Meteo wind speed and wave height."""

    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.risk_results
    __table_args__ = (
        UniqueConstraint(
            "sampling_location_id",
            "observation_timestamp",
            "analytics_version",
            name="uq_risk_result_location_timestamp_version",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sampling_location_id: Mapped[int] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.sampling_locations}.id"),
        nullable=False,
        index=True,
    )
    observation_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    marine_observation_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{DEFAULT_PERSISTENCE_TABLE_NAMES.marine_observations}.marine_observation_id"),
        nullable=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="open-meteo")
    wind_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    analytics_version: Mapped[str] = mapped_column(String(64), nullable=False, default="deterministic-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    sampling_location: Mapped[SamplingLocation] = relationship(back_populates="risk_results")
    marine_observation: Mapped["MarineObservation | None"] = relationship(
        back_populates="risk_results",
    )
