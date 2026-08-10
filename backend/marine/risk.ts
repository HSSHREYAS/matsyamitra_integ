import type {MarineObservation, RiskResult} from './types';

const RISK_WEIGHTS = {
  wave: 0.6,
  wind: 0.4,
};

export function scoreOperationalRiskFromMarine(observation: MarineObservation): RiskResult {
  const riskValues = {
    wave: risingRiskIndex(observation.waveHeight, 0, 15, 0.5, 1.5, 2.5),
    wind: risingRiskIndex(observation.windSpeed, 0, 60, 7, 11, 17),
  };
  const riskScore = weightedScoreWithRedistribution(riskValues, RISK_WEIGHTS);

  return {
    locationId: observation.locationId,
    latitude: observation.latitude,
    longitude: observation.longitude,
    sourceLatitude: observation.sourceLatitude,
    sourceLongitude: observation.sourceLongitude,
    observationTimestamp: observation.observationTimestamp,
    windSpeed: observation.windSpeed,
    waveHeight: observation.waveHeight,
    riskScore,
    riskCategory: riskCategory(riskScore),
  };
}

function risingRiskIndex(
  value: number | null,
  validMin: number,
  validMax: number,
  safeMax: number,
  moderateAt: number,
  extremeAt: number,
): number | null {
  if (value === null || !Number.isFinite(value) || value < validMin || value > validMax) {
    return null;
  }
  if (value <= safeMax) {
    return 0;
  }
  if (value <= moderateAt) {
    return clampUnit(((value - safeMax) / (moderateAt - safeMax)) * 0.5);
  }
  if (value <= extremeAt) {
    return clampUnit(0.5 + ((value - moderateAt) / (extremeAt - moderateAt)) * 0.5);
  }
  return 1;
}

function weightedScoreWithRedistribution(
  values: Record<string, number | null>,
  weights: Record<string, number>,
): number | null {
  const available = Object.entries(values).filter(([, value]) => value !== null) as Array<
    [string, number]
  >;
  if (available.length === 0) {
    return null;
  }

  const totalWeight = available.reduce((sum, [key]) => sum + weights[key], 0);
  const raw = available.reduce((sum, [key, value]) => sum + (weights[key] / totalWeight) * value, 0);
  return Math.round(raw * 1000) / 100;
}

function riskCategory(score: number | null): string {
  if (score === null) {
    return 'Unknown';
  }
  if (score <= 2) {
    return 'Safe';
  }
  if (score <= 4) {
    return 'Low Risk';
  }
  if (score <= 6) {
    return 'Moderate Risk';
  }
  if (score <= 8) {
    return 'High Risk';
  }
  return 'Extreme Risk';
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}
