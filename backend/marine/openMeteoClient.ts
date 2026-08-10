import type {MarineObservation, SamplingPoint} from './types';

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}>;

type OpenMeteoLocationResponse = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  generationtime_ms?: number;
  hourly?: {
    time?: string[];
    wind_speed_10m?: Array<number | null>;
    wave_height?: Array<number | null>;
  };
  hourly_units?: Record<string, string>;
};

export type OpenMeteoFetchResult = {
  observations: MarineObservation[];
  warnings: string[];
};

export async function fetchMarineData(
  points: SamplingPoint[],
  options: {
    baseUrl: string;
    forecastBaseUrl?: string;
    fetchFn?: FetchLike;
    targetTime?: string;
  },
): Promise<OpenMeteoFetchResult> {
  if (points.length === 0) {
    return {observations: [], warnings: ['No canonical sampling points supplied.']};
  }

  const fetchFn = options.fetchFn ?? fetch;
  const marineResponse = await fetchFn(buildOpenMeteoUrl(options.baseUrl, points));
  if (!marineResponse.ok) {
    throw new Error(`Open-Meteo marine request failed: ${marineResponse.status} ${marineResponse.statusText}`);
  }

  if (!options.forecastBaseUrl) {
    return parseOpenMeteoResponse(points, await marineResponse.json(), options.targetTime);
  }

  const forecastResponse = await fetchFn(buildOpenMeteoWindUrl(options.forecastBaseUrl, points));
  if (!forecastResponse.ok) {
    throw new Error(
      `Open-Meteo wind request failed: ${forecastResponse.status} ${forecastResponse.statusText}`,
    );
  }

  return parseCombinedOpenMeteoResponse(
    points,
    await marineResponse.json(),
    await forecastResponse.json(),
    options.targetTime,
  );
}

export function buildOpenMeteoUrl(baseUrl: string, points: SamplingPoint[]): string {
  const url = new URL(baseUrl);
  url.searchParams.set('latitude', points.map(point => point.latitude).join(','));
  url.searchParams.set('longitude', points.map(point => point.longitude).join(','));
  url.searchParams.set('hourly', 'wave_height');
  url.searchParams.set('cell_selection', 'sea');
  url.searchParams.set('forecast_days', '1');
  return url.toString();
}

export function buildOpenMeteoWindUrl(baseUrl: string, points: SamplingPoint[]): string {
  const url = new URL(baseUrl);
  url.searchParams.set('latitude', points.map(point => point.latitude).join(','));
  url.searchParams.set('longitude', points.map(point => point.longitude).join(','));
  url.searchParams.set('hourly', 'wind_speed_10m');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('forecast_days', '1');
  return url.toString();
}

export function parseOpenMeteoResponse(
  points: SamplingPoint[],
  payload: unknown,
  targetTime?: string,
): OpenMeteoFetchResult {
  const responses = normalizeResponseArray(payload);
  if (responses.length !== points.length) {
    throw new Error(
      `Open-Meteo returned ${responses.length} location responses for ${points.length} requested points.`,
    );
  }

  const warnings: string[] = [];
  const observations = responses.map((locationResponse, index) => {
    const point = points[index];
    const hourly = locationResponse.hourly ?? {};
    const times = hourly.time ?? [];
    const selectedIndex = selectHourlyIndex(times, targetTime);
    const timestamp = times[selectedIndex];

    if (!timestamp) {
      warnings.push(`No hourly timestamp returned for ${point.locationId}.`);
    }

    const windSpeed = normalizeOptionalNumber(hourly.wind_speed_10m?.[selectedIndex]);
    const waveHeight = normalizeOptionalNumber(hourly.wave_height?.[selectedIndex]);

    if (windSpeed !== null && windSpeed < 0) {
      warnings.push(`Invalid negative wind speed for ${point.locationId}.`);
    }
    if (waveHeight !== null && waveHeight < 0) {
      warnings.push(`Invalid negative wave height for ${point.locationId}.`);
    }

    return {
      locationId: point.locationId,
      latitude: point.latitude,
      longitude: point.longitude,
      observationTimestamp: timestamp,
      windSpeed: windSpeed !== null && windSpeed >= 0 ? windSpeed : null,
      waveHeight: waveHeight !== null && waveHeight >= 0 ? waveHeight : null,
      source: 'open-meteo' as const,
      sourceLatitude: normalizeOptionalNumber(locationResponse.latitude),
      sourceLongitude: normalizeOptionalNumber(locationResponse.longitude),
      sourceMetadata: {
        hourly_units: locationResponse.hourly_units ?? {},
        generationtime_ms: locationResponse.generationtime_ms,
      },
    };
  });

  return {observations: observations.filter(validateMarineObservation), warnings};
}

export function parseCombinedOpenMeteoResponse(
  points: SamplingPoint[],
  marinePayload: unknown,
  windPayload: unknown,
  targetTime?: string,
): OpenMeteoFetchResult {
  const marineResponses = normalizeResponseArray(marinePayload);
  const windResponses = normalizeResponseArray(windPayload);
  if (marineResponses.length !== points.length || windResponses.length !== points.length) {
    throw new Error(
      `Open-Meteo returned marine=${marineResponses.length}, wind=${windResponses.length} responses for ${points.length} requested points.`,
    );
  }

  const warnings: string[] = [];
  const observations = points.map((point, index) => {
    const marine = marineResponses[index];
    const wind = windResponses[index];
    const marineTimes = marine.hourly?.time ?? [];
    const windTimes = wind.hourly?.time ?? [];
    const marineIndex = selectHourlyIndex(marineTimes, targetTime);
    const timestamp = marineTimes[marineIndex] ?? windTimes[selectHourlyIndex(windTimes, targetTime)];
    const windIndex = timestamp ? windTimes.indexOf(timestamp) : selectHourlyIndex(windTimes, targetTime);

    if (!timestamp) {
      warnings.push(`No matching hourly timestamp returned for ${point.locationId}.`);
    }

    const waveHeight = normalizeOptionalNumber(marine.hourly?.wave_height?.[marineIndex]);
    const windSpeed = normalizeOptionalNumber(wind.hourly?.wind_speed_10m?.[windIndex]);

    if (windSpeed === null) {
      warnings.push(`Missing wind_speed_10m for ${point.locationId}.`);
    } else if (windSpeed < 0) {
      warnings.push(`Invalid negative wind speed for ${point.locationId}.`);
    }

    if (waveHeight === null) {
      warnings.push(`Missing wave_height for ${point.locationId}.`);
    } else if (waveHeight < 0) {
      warnings.push(`Invalid negative wave height for ${point.locationId}.`);
    }

    return {
      locationId: point.locationId,
      latitude: point.latitude,
      longitude: point.longitude,
      observationTimestamp: timestamp,
      windSpeed: windSpeed !== null && windSpeed >= 0 ? windSpeed : null,
      waveHeight: waveHeight !== null && waveHeight >= 0 ? waveHeight : null,
      source: 'open-meteo' as const,
      sourceLatitude: normalizeOptionalNumber(marine.latitude),
      sourceLongitude: normalizeOptionalNumber(marine.longitude),
      sourceMetadata: {
        marine_hourly_units: marine.hourly_units ?? {},
        wind_hourly_units: wind.hourly_units ?? {},
        marine_generationtime_ms: marine.generationtime_ms,
        wind_generationtime_ms: wind.generationtime_ms,
        wind_source_latitude: normalizeOptionalNumber(wind.latitude),
        wind_source_longitude: normalizeOptionalNumber(wind.longitude),
      },
    };
  });

  return {observations: observations.filter(validateMarineObservation), warnings};
}

function normalizeResponseArray(payload: unknown): OpenMeteoLocationResponse[] {
  if (Array.isArray(payload)) {
    return payload as OpenMeteoLocationResponse[];
  }
  return [payload as OpenMeteoLocationResponse];
}

function selectHourlyIndex(times: string[], targetTime?: string): number {
  if (times.length === 0) {
    return -1;
  }
  if (targetTime) {
    const exact = times.indexOf(targetTime);
    if (exact >= 0) {
      return exact;
    }
  }
  return times.length - 1;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function validateMarineObservation(observation: MarineObservation): boolean {
  return Boolean(
    observation.locationId &&
      observation.source &&
      observation.observationTimestamp &&
      Number.isFinite(observation.latitude) &&
      Number.isFinite(observation.longitude) &&
      observation.latitude >= -90 &&
      observation.latitude <= 90 &&
      observation.longitude >= -180 &&
      observation.longitude <= 180 &&
      (observation.windSpeed === null || observation.windSpeed >= 0) &&
      (observation.waveHeight === null || observation.waveHeight >= 0),
  );
}
