from analytics.persistence.models import MarineObservation, SamplingLocation
from sqlalchemy.orm import Session
from sqlalchemy import select, update

class MarineObservationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def backfill_sampling_location_ids(self) -> int:
        """Update marine_observations to link to sampling_locations.id using location_id."""
        locations = self.session.scalars(select(SamplingLocation)).all()
        loc_map = {loc.location_id: loc.id for loc in locations}
        
        # We can update them one by one or in bulk
        unlinked = self.session.scalars(
            select(MarineObservation).where(MarineObservation.sampling_location_id.is_(None))
        ).all()
        
        updated_count = 0
        for obs in unlinked:
            if obs.location_id in loc_map:
                obs.sampling_location_id = loc_map[obs.location_id]
                updated_count += 1
                
        self.session.flush()
        return updated_count

    def get_latest_unscored_observations(self, source: str) -> list[MarineObservation]:
        """Get latest observations that have a valid sampling location, per canonical location."""
        from sqlalchemy import func
        
        subquery = (
            select(
                MarineObservation.marine_observation_id,
                func.row_number()
                .over(
                    partition_by=MarineObservation.sampling_location_id,
                    order_by=(MarineObservation.observation_timestamp.desc(), MarineObservation.marine_observation_id.desc()),
                )
                .label("rn"),
            )
            .where(MarineObservation.source == source, MarineObservation.sampling_location_id.is_not(None))
            .subquery()
        )

        statement = (
            select(MarineObservation)
            .join(subquery, MarineObservation.marine_observation_id == subquery.c.marine_observation_id)
            .where(subquery.c.rn == 1)
        )
        return list(self.session.scalars(statement).all())
