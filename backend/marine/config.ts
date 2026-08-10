import path from 'path';
import type {DuplicatePolicy} from './types';

export const OPEN_METEO_MARINE_BASE_URL =
  process.env.OPEN_METEO_MARINE_BASE_URL ?? 'https://marine-api.open-meteo.com/v1/marine';

export const OPEN_METEO_FORECAST_BASE_URL =
  process.env.OPEN_METEO_FORECAST_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast';

export const DATABASE_URL = process.env.MATSYAMITRA_DATABASE_URL ?? '';

export const DUPLICATE_POLICY = (
  process.env.MATSYAMITRA_DUPLICATE_POLICY ?? 'skip'
) as DuplicatePolicy;

export const SAMPLING_POINTS_PATH =
  process.env.MATSYAMITRA_SAMPLING_POINTS_PATH ??
  path.resolve(__dirname, '..', '..', 'analytics', 'data', 'geometry', 'sampling_points.geojson');
