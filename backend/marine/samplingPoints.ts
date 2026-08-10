import fs from 'fs';
import type {SamplingPoint} from './types';

type GeoJsonFeature = {
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown[];
  };
};

export function loadSamplingPoints(filePath: string): SamplingPoint[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {features?: GeoJsonFeature[]};
  const points = (raw.features ?? []).map((feature, index) => {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties ?? {};
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);
    const locationId = String(properties.location_id ?? `KARN_${String(index + 1).padStart(3, '0')}`);

    validateSamplingPoint({locationId, latitude, longitude});
    return {locationId, latitude, longitude};
  });

  const ids = new Set(points.map(point => point.locationId));
  if (ids.size !== points.length) {
    throw new Error('Canonical sampling points contain duplicate location_id values.');
  }

  return points;
}

export function validateSamplingPoint(point: SamplingPoint): void {
  if (!point.locationId) {
    throw new Error('Sampling point location_id is required.');
  }
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new Error(`Invalid latitude for ${point.locationId}.`);
  }
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new Error(`Invalid longitude for ${point.locationId}.`);
  }
}
