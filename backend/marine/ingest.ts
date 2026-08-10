import type {Pool} from 'pg';
import {
  DUPLICATE_POLICY,
  OPEN_METEO_FORECAST_BASE_URL,
  OPEN_METEO_MARINE_BASE_URL,
  SAMPLING_POINTS_PATH,
} from './config';
import {fetchMarineData} from './openMeteoClient';
import {
  createMarineObservationsTable,
  getLatestMarineObservations,
  persistMarineObservations,
} from './repository';
import {scoreOperationalRiskFromMarine} from './risk';
import {loadSamplingPoints} from './samplingPoints';
import type {DuplicatePolicy, MarineIngestionSummary, RiskResult} from './types';

export type MarineIngestionResult = {
  summary: MarineIngestionSummary;
  riskResults: RiskResult[];
};

export async function runMarineIngestion(
  pool: Pool,
  options: {
    samplingPointsPath?: string;
    openMeteoBaseUrl?: string;
    openMeteoForecastBaseUrl?: string;
    duplicatePolicy?: DuplicatePolicy;
  } = {},
): Promise<MarineIngestionResult> {
  const points = loadSamplingPoints(options.samplingPointsPath ?? SAMPLING_POINTS_PATH);
  const {observations, warnings} = await fetchMarineData(points, {
    baseUrl: options.openMeteoBaseUrl ?? OPEN_METEO_MARINE_BASE_URL,
    forecastBaseUrl: options.openMeteoForecastBaseUrl ?? OPEN_METEO_FORECAST_BASE_URL,
  });

  const client = await pool.connect();
  try {
    await client.query('begin');
    await createMarineObservationsTable(client);
    const summary = await persistMarineObservations(
      client,
      observations,
      options.duplicatePolicy ?? DUPLICATE_POLICY,
    );
    await client.query('commit');

    const latestObservations = await getLatestMarineObservations(client, 'open-meteo', points.length);
    return {
      summary: {
        ...summary,
        requestedLocations: points.length,
        parsedObservations: observations.length,
        warnings: [...warnings, ...summary.warnings],
      },
      riskResults: latestObservations.map(scoreOperationalRiskFromMarine),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
