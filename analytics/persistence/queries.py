from datetime import date

from sqlalchemy.orm import Session

from analytics.persistence.repository import EnvironmentalObservationRepository
from analytics.schemas import EnvironmentalRecord


def get_observations_by_date(session: Session, observation_date: date) -> list[EnvironmentalRecord]:
    return EnvironmentalObservationRepository(session).get_observations_by_date(observation_date)


def get_observations_between_dates(
    session: Session,
    start_date: date,
    end_date: date,
) -> list[EnvironmentalRecord]:
    return EnvironmentalObservationRepository(session).get_observations_between_dates(
        start_date,
        end_date,
    )


def get_latest_available_observation_date(session: Session) -> date | None:
    return EnvironmentalObservationRepository(session).get_latest_date()


def get_observation_count(session: Session) -> int:
    return EnvironmentalObservationRepository(session).count_rows()


def get_observation_bounding_box(session: Session) -> dict[str, float] | None:
    return EnvironmentalObservationRepository(session).get_observation_bounding_box()
