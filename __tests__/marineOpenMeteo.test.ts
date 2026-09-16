import {Pool} from 'pg';
import {
  buildOpenMeteoUrl,
  buildOpenMeteoWindUrl,
  fetchMarineData,
  parseCombinedOpenMeteoResponse,
  parseOpenMeteoResponse,
  selectHourlyIndex,
} from '../backend/marine/openMeteoClient';
import {
  createMarineObservationsTable,
  getLatestMarineObservations,
  persistMarineObservations,
} from '../backend/marine/repository';
import {scoreOperationalRiskFromMarine} from '../backend/marine/risk';
import type {MarineObservation, SamplingPoint} from '../backend/marine/types';

const points: SamplingPoint[] = [
  {locationId: 'KARN_001', latitude: 14.602642, longitude: 73.152614},
  {locationId: 'KARN_002', latitude: 13.714424, longitude: 74.206417},
];

const openMeteoPayload = [
  {
    latitude: 14.5,
    longitude: 73.125,
    hourly_units: {wind_speed_10m: 'm/s', wave_height: 'm'},
    hourly: {
      time: ['2026-08-09T00:00', '2026-08-09T01:00'],
      wind_speed_10m: [4, 8],
      wave_height: [0.4, 2],
    },
  },
  {
    latitude: 13.75,
    longitude: 74.25,
    hourly_units: {wind_speed_10m: 'm/s', wave_height: 'm'},
    hourly: {
      time: ['2026-08-09T00:00', '2026-08-09T01:00'],
      wind_speed_10m: [5, 9],
      wave_height: [0.5, 1.5],
    },
  },
];

function sampleObservation(overrides: Partial<MarineObservation> = {}): MarineObservation {
  return {
    locationId: 'KARN_001',
    latitude: 14.602642,
    longitude: 73.152614,
    observationTimestamp: `2035-01-01T${String(Math.floor(Math.random() * 23)).padStart(2, '0')}:00:00.000Z`,
    windSpeed: 8,
    waveHeight: 2,
    source: 'open-meteo',
    sourceLatitude: 14.5,
    sourceLongitude: 73.125,
    sourceMetadata: {test: true},
    ...overrides,
  };
}

describe('Open-Meteo marine integration', () => {
  test('builds batched multiple-coordinate URLs for wave and wind data', () => {
    const marineUrl = buildOpenMeteoUrl('https://marine-api.open-meteo.com/v1/marine', points);
    const windUrl = buildOpenMeteoWindUrl('https://api.open-meteo.com/v1/forecast', points);

    expect(marineUrl).toContain('latitude=14.602642%2C13.714424');
    expect(marineUrl).toContain('longitude=73.152614%2C74.206417');
    expect(marineUrl).toContain('hourly=wave_height');
    expect(marineUrl).toContain('cell_selection=sea');
    expect(windUrl).toContain('hourly=wind_speed_10m');
    expect(windUrl).toContain('wind_speed_unit=ms');
  });

  test('combines marine wave and forecast wind responses by canonical location order', () => {
    const marinePayload = openMeteoPayload.map(response => ({
      ...response,
      hourly: {time: response.hourly.time, wave_height: response.hourly.wave_height},
    }));
    const windPayload = openMeteoPayload.map(response => ({
      ...response,
      hourly: {time: response.hourly.time, wind_speed_10m: response.hourly.wind_speed_10m},
    }));

    const result = parseCombinedOpenMeteoResponse(
      points,
      marinePayload,
      windPayload,
      '2026-08-09T01:00',
    );

    expect(result.observations[0].locationId).toBe('KARN_001');
    expect(result.observations[0].latitude).toBe(14.602642);
    expect(result.observations[0].windSpeed).toBe(8);
    expect(result.observations[0].waveHeight).toBe(2);
  });

  test('parses multiple-coordinate responses and preserves canonical coordinates', () => {
    const result = parseOpenMeteoResponse(points, openMeteoPayload, '2026-08-09T01:00');

    expect(result.observations).toHaveLength(2);
    expect(result.observations[0].locationId).toBe('KARN_001');
    expect(result.observations[0].latitude).toBe(14.602642);
    expect(result.observations[0].longitude).toBe(73.152614);
    expect(result.observations[0].sourceLatitude).toBe(14.5);
    expect(result.observations[0].sourceLongitude).toBe(73.125);
    expect(result.observations[0].windSpeed).toBe(8);
    expect(result.observations[0].waveHeight).toBe(2);
  });

  test('fetchMarineData uses a mocked HTTP response', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () =>
          openMeteoPayload.map(response => ({
            ...response,
            hourly: {time: response.hourly.time, wave_height: response.hourly.wave_height},
          })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () =>
          openMeteoPayload.map(response => ({
            ...response,
            hourly: {time: response.hourly.time, wind_speed_10m: response.hourly.wind_speed_10m},
          })),
      });

    const result = await fetchMarineData(points, {
      baseUrl: 'https://marine-api.open-meteo.com/v1/marine',
      forecastBaseUrl: 'https://api.open-meteo.com/v1/forecast',
      fetchFn,
      targetTime: '2026-08-09T00:00',
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.observations[1].windSpeed).toBe(5);
    expect(result.observations[1].waveHeight).toBe(0.5);
  });

  test('handles missing wind and wave values without converting them to zero', () => {
    const result = parseOpenMeteoResponse(
      points.slice(0, 1),
      [{...openMeteoPayload[0], hourly: {time: ['2026-08-09T00:00'], wind_speed_10m: [null], wave_height: [null]}}],
    );

    expect(result.observations[0].windSpeed).toBeNull();
    expect(result.observations[0].waveHeight).toBeNull();
  });

  test('rejects invalid negative values by storing them as null', () => {
    const result = parseOpenMeteoResponse(
      points.slice(0, 1),
      [{...openMeteoPayload[0], hourly: {time: ['2026-08-09T00:00'], wind_speed_10m: [-1], wave_height: [-2]}}],
    );

    expect(result.observations[0].windSpeed).toBeNull();
    expect(result.observations[0].waveHeight).toBeNull();
    expect(result.warnings).toHaveLength(2);
  });

  test('scores operational risk using Open-Meteo wind and wave only', () => {
    const marine = sampleObservation({windSpeed: 8, waveHeight: 2});
    const geeReference = {windSpeed: 60, waveHeight: 15};

    const risk = scoreOperationalRiskFromMarine(marine);

    expect(geeReference.windSpeed).toBe(60);
    expect(risk.riskScore).toBe(5);
    expect(risk.riskCategory).toBe('Moderate Risk');
  });

  test('selects hourly index corresponding to current/latest available observation', () => {
    const times = [
      '2026-09-13T00:00',
      '2026-09-13T01:00',
      '2026-09-13T02:00',
      '2026-09-13T03:00',
    ];

    // Exact target time selection
    expect(selectHourlyIndex(times, '2026-09-13T02:00')).toBe(2);

    // Target time between hours selects most recent past hour
    expect(selectHourlyIndex(times, '2026-09-13T02:30:00Z')).toBe(2);

    // Empty times array returns -1
    expect(selectHourlyIndex([])).toBe(-1);

    // Past times array without targetTime selects latest available
    expect(selectHourlyIndex(times)).toBe(3);
  });
});

describe('PostgreSQL marine persistence', () => {
  const databaseUrl = process.env.MATSYAMITRA_DATABASE_URL;
  const maybeTest = databaseUrl ? test : test.skip;

  maybeTest('persists, retrieves, and deduplicates hourly marine observations', async () => {
    const pool = new Pool({connectionString: databaseUrl});
    const client = await pool.connect();
    const observation = sampleObservation({observationTimestamp: '2035-01-01T00:00:00.000Z'});

    try {
      await client.query('begin');
      await createMarineObservationsTable(client);

      const inserted = await persistMarineObservations(client, [observation], 'skip');
      const skipped = await persistMarineObservations(client, [observation], 'skip');
      const updated = await persistMarineObservations(
        client,
        [{...observation, windSpeed: 10, waveHeight: 2.5}],
        'update',
      );

      const latest = await getLatestMarineObservations(client, 'open-meteo', 1);

      expect(inserted.inserted).toBe(1);
      expect(skipped.skipped).toBe(1);
      expect(updated.updated).toBe(1);
      expect(latest[0].locationId).toBe('KARN_001');
      expect(latest[0].windSpeed).toBe(10);
    } finally {
      await client.query('rollback');
      client.release();
      await pool.end();
    }
  });
});
