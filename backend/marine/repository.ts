import {Pool, type PoolClient} from 'pg';
import type {DuplicatePolicy, MarineIngestionSummary, MarineObservation} from './types';

export function createMarinePool(databaseUrl: string): Pool {
  if (!databaseUrl) {
    throw new Error('MATSYAMITRA_DATABASE_URL is required for marine ingestion.');
  }
  return new Pool({connectionString: databaseUrl});
}

export async function createMarineObservationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    create table if not exists marine_observations (
      marine_observation_id serial primary key,
      location_id varchar(32) not null,
      latitude double precision not null,
      longitude double precision not null,
      observation_timestamp timestamptz not null,
      wind_speed double precision,
      wave_height double precision,
      source varchar(64) not null,
      source_latitude double precision,
      source_longitude double precision,
      source_metadata jsonb,
      created_at timestamptz not null default now(),
      unique (location_id, observation_timestamp, source)
    )
  `);
}

export async function persistMarineObservations(
  client: PoolClient,
  observations: MarineObservation[],
  duplicatePolicy: DuplicatePolicy,
): Promise<MarineIngestionSummary> {
  const summary: MarineIngestionSummary = {
    requestedLocations: observations.length,
    parsedObservations: observations.length,
    inserted: 0,
    skipped: 0,
    updated: 0,
    replaced: 0,
    warnings: [],
  };

  for (const observation of observations) {
    const existing = await client.query(
      `
        select marine_observation_id
        from marine_observations
        where location_id = $1
          and observation_timestamp = $2
          and source = $3
      `,
      [observation.locationId, observation.observationTimestamp, observation.source],
    );

    if (existing.rowCount && duplicatePolicy === 'skip') {
      summary.skipped += 1;
      continue;
    }

    if (existing.rowCount && duplicatePolicy === 'update') {
      await client.query(
        `
          update marine_observations
          set latitude = $1,
              longitude = $2,
              wind_speed = $3,
              wave_height = $4,
              source_latitude = $5,
              source_longitude = $6,
              source_metadata = $7
          where marine_observation_id = $8
        `,
        [
          observation.latitude,
          observation.longitude,
          observation.windSpeed,
          observation.waveHeight,
          observation.sourceLatitude,
          observation.sourceLongitude,
          observation.sourceMetadata ?? {},
          existing.rows[0].marine_observation_id,
        ],
      );
      summary.updated += 1;
      continue;
    }

    if (existing.rowCount && duplicatePolicy === 'replace') {
      await client.query('delete from marine_observations where marine_observation_id = $1', [
        existing.rows[0].marine_observation_id,
      ]);
      summary.replaced += 1;
    }

    await client.query(
      `
        insert into marine_observations (
          location_id,
          latitude,
          longitude,
          observation_timestamp,
          wind_speed,
          wave_height,
          source,
          source_latitude,
          source_longitude,
          source_metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        observation.locationId,
        observation.latitude,
        observation.longitude,
        observation.observationTimestamp,
        observation.windSpeed,
        observation.waveHeight,
        observation.source,
        observation.sourceLatitude,
        observation.sourceLongitude,
        observation.sourceMetadata ?? {},
        new Date().toISOString(),
      ],
    );
    summary.inserted += 1;
  }

  return summary;
}

export async function getLatestMarineObservations(
  client: PoolClient,
  source = 'open-meteo',
  limit = 25,
): Promise<MarineObservation[]> {
  const result = await client.query(
    `
      select location_id,
             latitude,
             longitude,
             observation_timestamp,
             wind_speed,
             wave_height,
             source,
             source_latitude,
             source_longitude,
             source_metadata
      from marine_observations
      where source = $1
      order by observation_timestamp desc, location_id
      limit $2
    `,
    [source, limit],
  );

  return result.rows.map(row => ({
    locationId: row.location_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    observationTimestamp: new Date(row.observation_timestamp).toISOString(),
    windSpeed: row.wind_speed === null ? null : Number(row.wind_speed),
    waveHeight: row.wave_height === null ? null : Number(row.wave_height),
    source: 'open-meteo',
    sourceLatitude: row.source_latitude === null ? null : Number(row.source_latitude),
    sourceLongitude: row.source_longitude === null ? null : Number(row.source_longitude),
    sourceMetadata: row.source_metadata ?? {},
  }));
}
