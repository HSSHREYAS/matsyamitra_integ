from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import pandas as pd
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from analytics.metadata import list_parameter_metadata
from analytics.persistence.exceptions import DuplicateObservationError, InsertionError
from analytics.persistence.models import DatasetMetadata, EnvironmentalObservation, ExtractionRun
from analytics.schemas import EnvironmentalRecord


@dataclass(frozen=True)
class ExtractionRunRecord:
    run_id: str
    retained_count: int
    status: str


class EnvironmentalObservationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_extraction_run(
        self,
        requested_start_date: date | None,
        requested_end_date: date | None,
        sample_count: int,
        retained_count: int,
        missing_summary: dict[str, Any],
        execution_time: float | None = None,
        status: str = "success",
        warnings: list[str] | None = None,
    ) -> ExtractionRunRecord:
        run = ExtractionRun(
            requested_start_date=requested_start_date,
            requested_end_date=requested_end_date,
            sample_count=sample_count,
            retained_count=retained_count,
            missing_summary=missing_summary,
            execution_time=execution_time,
            status=status,
            warnings=warnings or [],
        )
        self.session.add(run)
        self.session.flush()
        return ExtractionRunRecord(run_id=run.run_id, retained_count=run.retained_count, status=run.status)

    def insert_observations(self, dataframe: pd.DataFrame, run_id: str) -> int:
        observations = [
            EnvironmentalObservation(
                latitude=float(row.Latitude),
                longitude=float(row.Longitude),
                observation_date=_to_date(row.Date),
                sst=_optional_float(row.SST),
                wind_speed=_optional_float(row.WindSpeed),
                wave_height=_optional_float(row.WaveHeight),
                chlorophyll=_optional_float(row.Chlorophyll),
                run_id=run_id,
            )
            for row in dataframe.itertuples(index=False)
        ]

        try:
            self.session.add_all(observations)
            self.session.flush()
        except IntegrityError as exc:
            self.session.rollback()
            raise DuplicateObservationError(
                "Duplicate environmental observation for latitude, longitude, and date."
            ) from exc
        except SQLAlchemyError as exc:
            self.session.rollback()
            raise InsertionError(f"Unable to insert environmental observations: {exc}") from exc

        return len(observations)

    def upsert_dataset_metadata(self, last_verified: date | None = None) -> int:
        count = 0
        for metadata in list_parameter_metadata():
            existing = self.session.get(DatasetMetadata, metadata.column)
            if existing is None:
                self.session.add(
                    DatasetMetadata(
                        parameter=metadata.column,
                        dataset=metadata.dataset,
                        unit=metadata.canonical_unit,
                        resolution=None,
                        description=metadata.description,
                        last_verified=last_verified,
                    )
                )
            else:
                existing.dataset = metadata.dataset
                existing.unit = metadata.canonical_unit
                existing.description = metadata.description
                existing.last_verified = last_verified
            count += 1

        self.session.flush()
        return count

    def get_observations_by_date(self, observation_date: date) -> list[EnvironmentalRecord]:
        statement = self._base_observation_select().where(
            EnvironmentalObservation.observation_date == observation_date
        )
        return self._records_from_statement(statement)

    def get_observations_between_dates(
        self,
        start_date: date,
        end_date: date,
    ) -> list[EnvironmentalRecord]:
        statement = self._base_observation_select().where(
            EnvironmentalObservation.observation_date >= start_date,
            EnvironmentalObservation.observation_date <= end_date,
        )
        return self._records_from_statement(statement)

    def delete_observations(
        self,
        before_date: date | None = None,
        observation_date: date | None = None,
    ) -> int:
        query = self.session.query(EnvironmentalObservation)
        if before_date is not None:
            query = query.filter(EnvironmentalObservation.observation_date < before_date)
        if observation_date is not None:
            query = query.filter(EnvironmentalObservation.observation_date == observation_date)
        return int(query.delete(synchronize_session=False))

    def count_rows(self) -> int:
        return int(self.session.scalar(select(func.count()).select_from(EnvironmentalObservation)) or 0)

    def get_latest_date(self) -> date | None:
        return self.session.scalar(select(func.max(EnvironmentalObservation.observation_date)))

    def get_observation_bounding_box(self) -> dict[str, float] | None:
        result = self.session.execute(
            select(
                func.min(EnvironmentalObservation.latitude),
                func.min(EnvironmentalObservation.longitude),
                func.max(EnvironmentalObservation.latitude),
                func.max(EnvironmentalObservation.longitude),
            )
        ).one()

        min_latitude, min_longitude, max_latitude, max_longitude = result
        if min_latitude is None:
            return None

        return {
            "min_latitude": float(min_latitude),
            "min_longitude": float(min_longitude),
            "max_latitude": float(max_latitude),
            "max_longitude": float(max_longitude),
        }

    def _base_observation_select(self) -> Select[tuple[EnvironmentalObservation]]:
        return select(EnvironmentalObservation).order_by(
            EnvironmentalObservation.observation_date,
            EnvironmentalObservation.latitude,
            EnvironmentalObservation.longitude,
        )

    def _records_from_statement(
        self,
        statement: Select[tuple[EnvironmentalObservation]],
    ) -> list[EnvironmentalRecord]:
        return [
            EnvironmentalRecord(
                latitude=observation.latitude,
                longitude=observation.longitude,
                date=datetime.combine(observation.observation_date, datetime.min.time()),
                sst=observation.sst,
                wind_speed=observation.wind_speed,
                wave_height=observation.wave_height,
                chlorophyll=observation.chlorophyll,
            )
            for observation in self.session.scalars(statement).all()
        ]


def _to_date(value: Any) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value)).date()


def _optional_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    return float(value)
