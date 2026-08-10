from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import pandas as pd
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from analytics.metadata import list_parameter_metadata
from analytics.persistence.exceptions import DuplicateObservationError, InsertionError
from analytics.persistence.models import AnalyticsResult, DatasetMetadata, EnvironmentalObservation, ExtractionRun, PfzResult, RiskResult, SamplingLocation
from analytics.schemas import EnvironmentalRecord
from analytics.scoring.models import PfzScoredResult, RiskScoredResult


@dataclass(frozen=True)
class ExtractionRunRecord:
    run_id: str
    retained_count: int
    status: str


@dataclass(frozen=True)
class ObservationInsertOutcome:
    inserted_count: int
    skipped_count: int
    updated_count: int
    replaced_count: int
    observations_for_analytics: list[EnvironmentalObservation]


@dataclass(frozen=True)
class AnalyticsStorageOutcome:
    generated_count: int
    stored_count: int


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

    def insert_observations_with_policy(
        self,
        dataframe: pd.DataFrame,
        run_id: str,
        duplicate_policy: str,
    ) -> ObservationInsertOutcome:
        if duplicate_policy not in {"skip", "replace", "update"}:
            raise InsertionError(
                "duplicate_policy must be one of: skip, replace, update."
            )

        inserted_count = 0
        skipped_count = 0
        updated_count = 0
        replaced_count = 0
        observations_for_analytics: list[EnvironmentalObservation] = []

        locations = self.session.query(SamplingLocation).all()
        location_map = {loc.location_id: loc.id for loc in locations}

        try:
            for row in dataframe.itertuples(index=False):
                observation_date = _to_date(row.Date)
                existing = self._find_observation(
                    latitude=float(row.Latitude),
                    longitude=float(row.Longitude),
                    observation_date=observation_date,
                )
                
                # Assign canonical ID if we know the location_id
                canonical_id = None
                if hasattr(row, "location_id") and row.location_id in location_map:
                    canonical_id = location_map[row.location_id]

                if existing is not None and duplicate_policy == "skip":
                    skipped_count += 1
                    continue

                if existing is not None and duplicate_policy == "update":
                    existing.sst = _optional_float(row.SST)
                    existing.wind_speed = _optional_float(row.WindSpeed)
                    existing.wave_height = _optional_float(row.WaveHeight)
                    existing.chlorophyll = _optional_float(row.Chlorophyll)
                    existing.run_id = run_id
                    if canonical_id is not None:
                        existing.sampling_location_id = canonical_id
                    updated_count += 1
                    observations_for_analytics.append(existing)
                    continue

                if existing is not None and duplicate_policy == "replace":
                    self.session.delete(existing)
                    self.session.flush()
                    replaced_count += 1

                observation = EnvironmentalObservation(
                    sampling_location_id=canonical_id,
                    latitude=float(row.Latitude),
                    longitude=float(row.Longitude),
                    observation_date=observation_date,
                    sst=_optional_float(row.SST),
                    wind_speed=_optional_float(row.WindSpeed),
                    wave_height=_optional_float(row.WaveHeight),
                    chlorophyll=_optional_float(row.Chlorophyll),
                    run_id=run_id,
                )
                self.session.add(observation)
                self.session.flush()
                inserted_count += 1
                observations_for_analytics.append(observation)
        except SQLAlchemyError as exc:
            raise InsertionError(f"Unable to insert environmental observations: {exc}") from exc

        return ObservationInsertOutcome(
            inserted_count=inserted_count,
            skipped_count=skipped_count,
            updated_count=updated_count,
            replaced_count=replaced_count,
            observations_for_analytics=observations_for_analytics,
        )

    def store_analytics_results(
        self,
        analytics_rows: list[dict[str, Any]],
        analytics_version: str,
    ) -> AnalyticsStorageOutcome:
        try:
            for row in analytics_rows:
                self.session.query(AnalyticsResult).filter(
                    AnalyticsResult.observation_id == int(row["observation_id"]),
                    AnalyticsResult.analytics_version == analytics_version,
                ).delete(synchronize_session=False)

                self.session.add(
                    AnalyticsResult(
                        observation_id=int(row["observation_id"]),
                        pfz_score=_optional_float(row.get("pfz_score")),
                        pfz_category=str(row["pfz_category"]),
                        risk_score=_optional_float(row.get("risk_score")),
                        risk_category=str(row["risk_category"]),
                        confidence_score=float(row["confidence_score"]),
                        confidence_label=str(row["confidence_label"]),
                        explanation=str(row["explanation"]),
                        analytics_version=analytics_version,
                    )
                )

            self.session.flush()
        except SQLAlchemyError as exc:
            raise InsertionError(f"Unable to store analytics results: {exc}") from exc

        return AnalyticsStorageOutcome(
            generated_count=len(analytics_rows),
            stored_count=len(analytics_rows),
        )

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

    def count_analytics_rows(self) -> int:
        return int(self.session.scalar(select(func.count()).select_from(AnalyticsResult)) or 0)

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

    def _find_observation(
        self,
        latitude: float,
        longitude: float,
        observation_date: date,
    ) -> EnvironmentalObservation | None:
        return self.session.scalar(
            select(EnvironmentalObservation).where(
                EnvironmentalObservation.latitude == latitude,
                EnvironmentalObservation.longitude == longitude,
                EnvironmentalObservation.observation_date == observation_date,
            )
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


class PfzRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def insert_pfz_result(self, result: PfzScoredResult) -> int:
        """Insert a single PfzScoredResult. Handles duplicates by ignoring them."""
        existing = self.session.scalar(
            select(PfzResult).where(
                PfzResult.sampling_location_id == result.sampling_location_id,
                PfzResult.observation_date == result.observation_date,
                PfzResult.analytics_version == result.analytics_version,
            )
        )
        if existing is not None:
            return 0

        pfz_row = PfzResult(
            sampling_location_id=result.sampling_location_id,
            observation_date=result.observation_date,
            environmental_observation_id=result.environmental_observation_id,
            source=result.source,
            sst=result.sst,
            chlorophyll=result.chlorophyll,
            pfz_score=result.pfz_score,
            pfz_category=result.pfz_category,
            confidence_score=result.confidence_score,
            analytics_version=result.analytics_version,
        )
        self.session.add(pfz_row)
        self.session.flush()
        return 1

    def get_latest_pfz_results(self) -> list[PfzResult]:
        """Return exactly one latest PFZ result for each active canonical sampling location."""
        # Use ROW_NUMBER window function to remain compatible with SQLite and Postgres
        subquery = (
            select(
                PfzResult.id,
                func.row_number()
                .over(
                    partition_by=PfzResult.sampling_location_id,
                    order_by=(PfzResult.observation_date.desc(), PfzResult.id.desc()),
                )
                .label("rn"),
            )
            .subquery()
        )

        statement = (
            select(PfzResult)
            .join(subquery, PfzResult.id == subquery.c.id)
            .where(subquery.c.rn == 1)
        )
        return list(self.session.scalars(statement).all())

    def get_latest_pfz_result_for_location(self, sampling_location_id: int) -> PfzResult | None:
        """Return the single latest PFZ result for a specific canonical sampling location."""
        statement = (
            select(PfzResult)
            .where(PfzResult.sampling_location_id == sampling_location_id)
            .order_by(PfzResult.observation_date.desc(), PfzResult.id.desc())
            .limit(1)
        )
        return self.session.scalar(statement)


class RiskRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def insert_risk_result(self, result: RiskScoredResult) -> int:
        """Insert a single RiskScoredResult. Handles duplicates by ignoring them."""
        existing = self.session.scalar(
            select(RiskResult).where(
                RiskResult.sampling_location_id == result.sampling_location_id,
                RiskResult.observation_timestamp == result.observation_timestamp,
                RiskResult.analytics_version == result.analytics_version,
            )
        )
        if existing is not None:
            return 0

        risk_row = RiskResult(
            sampling_location_id=result.sampling_location_id,
            observation_timestamp=result.observation_timestamp,
            marine_observation_id=result.marine_observation_id,
            source=result.source,
            wind_speed=result.wind_speed,
            wave_height=result.wave_height,
            risk_score=result.risk_score,
            risk_category=result.risk_category,
            confidence_score=result.confidence_score,
            analytics_version=result.analytics_version,
        )
        self.session.add(risk_row)
        self.session.flush()
        return 1

    def get_latest_risk_results(self) -> list[RiskResult]:
        """Return exactly one latest Risk result for each active canonical sampling location."""
        subquery = (
            select(
                RiskResult.id,
                func.row_number()
                .over(
                    partition_by=RiskResult.sampling_location_id,
                    order_by=(RiskResult.observation_timestamp.desc(), RiskResult.id.desc()),
                )
                .label("rn"),
            )
            .subquery()
        )

        statement = (
            select(RiskResult)
            .join(subquery, RiskResult.id == subquery.c.id)
            .where(subquery.c.rn == 1)
        )
        return list(self.session.scalars(statement).all())

    def get_latest_risk_result_for_location(self, sampling_location_id: int) -> RiskResult | None:
        """Return the single latest Risk result for a specific canonical sampling location."""
        statement = (
            select(RiskResult)
            .where(RiskResult.sampling_location_id == sampling_location_id)
            .order_by(RiskResult.observation_timestamp.desc(), RiskResult.id.desc())
            .limit(1)
        )
        return self.session.scalar(statement)
