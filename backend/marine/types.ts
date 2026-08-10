export type DuplicatePolicy = 'skip' | 'replace' | 'update';

export type SamplingPoint = {
  locationId: string;
  latitude: number;
  longitude: number;
};

export type MarineObservation = {
  locationId: string;
  latitude: number;
  longitude: number;
  observationTimestamp: string;
  windSpeed: number | null;
  waveHeight: number | null;
  source: 'open-meteo';
  sourceLatitude: number | null;
  sourceLongitude: number | null;
  sourceMetadata?: Record<string, unknown>;
};

export type MarineIngestionSummary = {
  requestedLocations: number;
  parsedObservations: number;
  inserted: number;
  skipped: number;
  updated: number;
  replaced: number;
  warnings: string[];
};

export type RiskResult = {
  locationId: string;
  latitude: number;
  longitude: number;
  sourceLatitude: number | null;
  sourceLongitude: number | null;
  observationTimestamp: string;
  windSpeed: number | null;
  waveHeight: number | null;
  riskScore: number | null;
  riskCategory: string;
};
