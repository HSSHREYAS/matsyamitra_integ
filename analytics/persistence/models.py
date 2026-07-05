from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
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


class DatasetMetadata(Base):
    __tablename__ = DEFAULT_PERSISTENCE_TABLE_NAMES.dataset_metadata

    parameter: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(64), nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    last_verified: Mapped[date | None] = mapped_column(Date, nullable=True)
