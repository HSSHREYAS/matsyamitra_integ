/**
 * Data Transformers — Maps backend API response schemas into frontend UI data models.
 */

import type { Advisory, AdvisorySeverity } from '../../data/mockAdvisory';
import type { AlertItem, AlertSeverity } from '../../data/mockAlerts';
import type { FishingZone, RiskZone } from '../../data/mockZones';
import type { WeatherData } from '../../data/mockWeather';
import { getCanonicalCityName } from './canonicalLocations';
import type {
  AlertResponse,
  CurrentStateResponse,
  IncoisAdvisoryResponse,
} from './types';

export type { AlertItem, AlertSeverity, Advisory, AdvisorySeverity, FishingZone, RiskZone, WeatherData };

/**
 * Maps a single CurrentStateResponse to WeatherCard display model.
 */
export function transformCurrentStateToWeather(
  state: CurrentStateResponse,
  locationName?: string
): WeatherData {
  const pfz = state.pfz;
  const risk = state.risk;
  const cityName = getCanonicalCityName(state.location_id, state.city_name);

  // Derive condition from risk category
  let condition = 'MODERATE SEA';
  let conditionIcon = 'weather-partly-cloudy';
  if (risk) {
    if (risk.category === 'Safe' || risk.category === 'Low Risk') {
      condition = 'CLEAR & CALM';
      conditionIcon = 'weather-sunny';
    } else if (risk.category === 'Moderate Risk') {
      condition = 'MODERATE SWELL';
      conditionIcon = 'weather-windy';
    } else if (risk.category === 'High Risk' || risk.category === 'Extreme Risk') {
      condition = 'ROUGH SEA WARNING';
      conditionIcon = 'weather-lightning-rainy';
    }
  }

  // Format updated ago
  let updatedAgo = 'LIVE DATA';
  if (risk && risk.age_hours !== undefined) {
    if (risk.age_hours < 1) {
      updatedAgo = 'UPDATED < 1 HR AGO';
    } else {
      updatedAgo = `UPDATED ${Math.round(risk.age_hours)} HRS AGO (${risk.status})`;
    }
  }

  return {
    temperature: 29, // Coastal ambient baseline
    condition,
    conditionIcon,
    windSpeed:
      risk?.wind_speed !== null && risk?.wind_speed !== undefined
        ? Math.round(risk.wind_speed * 3.6)
        : risk?.score !== null && risk?.score !== undefined
        ? Math.round(risk.score * 3.5)
        : 12,
    windUnit: 'km/h',
    waveHeight:
      risk?.wave_height !== null && risk?.wave_height !== undefined
        ? parseFloat(risk.wave_height.toFixed(1))
        : risk?.score !== null && risk?.score !== undefined
        ? parseFloat((risk.score * 0.4).toFixed(1))
        : 1.2,
    waveUnit: 'm',
    humidity: 78,
    seaTemp: 28.5,
    chlorophyll: pfz?.score ? parseFloat((pfz.score * 0.08).toFixed(2)) : 0.4,
    chlorophyllUnit: 'mg/m³',
    updatedAgo,
    location: locationName || `${cityName} (${state.latitude.toFixed(2)}°N, ${state.longitude.toFixed(2)}°E)`,
  };
}

/**
 * Creates a bounding box around a canonical point to render overlay polygons.
 */
function createBoxCoordinates(lat: number, lon: number, delta: number = 0.05) {
  return [
    { latitude: lat - delta, longitude: lon - delta },
    { latitude: lat + delta, longitude: lon - delta },
    { latitude: lat + delta, longitude: lon + delta },
    { latitude: lat - delta, longitude: lon + delta },
  ];
}

/**
 * Transforms all 25 canonical current states into FishingZone items for MapScreen.
 */
export function transformCurrentStatesToFishingZones(
  states: CurrentStateResponse[]
): FishingZone[] {
  return states
    .filter((s) => s.pfz !== null && s.pfz.score !== null)
    .map((s) => {
      const pfz = s.pfz!;
      const potential = Math.round(Math.min(100, Math.max(0, (pfz.score ?? 0) * 10)));
      const displayName = getCanonicalCityName(s.location_id, s.city_name);

      let chStatus: 'optimal' | 'moderate' | 'low' = 'moderate';
      if (potential >= 70) chStatus = 'optimal';
      else if (potential < 40) chStatus = 'low';

      return {
        id: `pfz-loc-${s.location_id}`,
        name: `${displayName} Offshore`,
        sectorCode: `Zone ${displayName}`,
        region: 'Karnataka Coast',
        potential,
        chlorophyll: parseFloat((potential * 0.005).toFixed(2)),
        chlorophyllStatus: chStatus,
        sst: 28.2,
        sstStatus: pfz.category.toUpperCase(),
        coordinates: createBoxCoordinates(s.latitude, s.longitude, 0.06),
        center: { latitude: s.latitude, longitude: s.longitude },
        fishingIntelligence: `PFZ Score: ${pfz.score?.toFixed(1)}/10 (${pfz.category}) near ${displayName}. Source: ${pfz.source.toUpperCase()}. Data status: ${pfz.status} (Age: ${pfz.age_hours.toFixed(0)}h). Confidence: ${(pfz.confidence * 100).toFixed(0)}%.`,
        species: potential >= 70 ? ['Mackerel', 'Sardine', 'Tuna'] : ['Pomfret', 'Squid'],
      };
    });
}

/**
 * Transforms all 25 canonical current states into RiskZone items for MapScreen.
 */
export function transformCurrentStatesToRiskZones(
  states: CurrentStateResponse[]
): RiskZone[] {
  return states
    .filter((s) => s.risk !== null && s.risk.score !== null)
    .map((s) => {
      const risk = s.risk!;
      const displayName = getCanonicalCityName(s.location_id, s.city_name);
      let riskLevel: 'critical' | 'moderate' | 'low' = 'low';
      let desc = `Risk score: ${risk.score?.toFixed(1)}/10 (${risk.category}) near ${displayName}. Normal marine operations.`;

      if (risk.category === 'High Risk' || risk.category === 'Extreme Risk') {
        riskLevel = 'critical';
        desc = `Critical wave/wind hazards near ${displayName}. Risk score: ${risk.score?.toFixed(1)}/10 (${risk.category}).`;
      } else if (risk.category === 'Moderate Risk') {
        riskLevel = 'moderate';
        desc = `Moderate swell conditions near ${displayName}. Score: ${risk.score?.toFixed(1)}/10. Caution advised.`;
      }

      return {
        id: `risk-loc-${s.location_id}`,
        name: `${displayName}`,
        riskLevel,
        waveHeight:
          risk.wave_height !== null && risk.wave_height !== undefined
            ? parseFloat(risk.wave_height.toFixed(1))
            : parseFloat(((risk.score ?? 1) * 0.45).toFixed(1)),
        windSpeed:
          risk.wind_speed !== null && risk.wind_speed !== undefined
            ? Math.round(risk.wind_speed * 3.6)
            : Math.round((risk.score ?? 1) * 4.2),
        description: `${desc} [Status: ${risk.status}, Age: ${risk.age_hours.toFixed(0)}h]`,
        center: { latitude: s.latitude, longitude: s.longitude },
        radius: riskLevel === 'critical' ? 14000 : riskLevel === 'moderate' ? 10000 : 7000,
      };
    });
}

/**
 * Transforms INCOIS advisory responses to HomeScreen Advisory model.
 */
export function transformIncoisAdvisoriesToUI(
  advisories: IncoisAdvisoryResponse[]
): Advisory[] {
  if (!advisories || advisories.length === 0) {
    return [];
  }

  return advisories.map((adv) => {
    const distStr = adv.distance_km ? `${adv.distance_km.toFixed(1)} km` : '';
    const bearingStr = adv.bearing_degrees ? `${adv.bearing_degrees.toFixed(0)}°` : '';
    const depthStr = adv.depth_m ? `${adv.depth_m.toFixed(0)}m depth` : '';
    const navDetails = [distStr, bearingStr, depthStr].filter(Boolean).join(' • ');

    const targetCity = getCanonicalCityName(
      adv.nearest_sampling_location_id
        ? `KARN_${String(adv.nearest_sampling_location_id).padStart(3, '0')}`
        : null,
      adv.city_name || adv.landing_center
    );

    return {
      id: `incois-adv-${adv.id}`,
      severity: 'safe' as AdvisorySeverity,
      badgeLabel: 'PFZ ACTIVE',
      title: `${targetCity}`,
      description: `Potential Fishing Zone near ${targetCity} (${adv.latitude.toFixed(2)}°N, ${adv.longitude.toFixed(2)}°E)${navDetails ? ` • ${navDetails}` : ''}.`,
      subLabel: adv.advisory_date ? `BULLETIN: ${adv.advisory_date}` : 'INCOIS ADVISORY',
      subIcon: 'check-circle-outline',
    };
  });
}

/**
 * Transforms AlertResponse items into AlertItem model for AlertsScreen.
 */
export function transformAlertsToUI(alerts: AlertResponse[]): AlertItem[] {
  return alerts.map((a) => {
    let severity: AlertSeverity = 'info';
    if (a.severity === 'urgent') severity = 'urgent';
    else if (a.severity === 'caution') severity = 'caution';
    else if (a.severity === 'seasonal') severity = 'seasonal';

    let category: 'official' | 'weather' | 'advisory' | 'news' = 'weather';
    if (a.category === 'advisory') category = 'advisory';
    else if (a.category === 'official') category = 'official';
    else if (a.category === 'news') category = 'news';

    // Sanitize any internal KARN_XXX in alert title or body
    let title = a.title || '';
    let body = a.body || '';
    title = title.replace(/KARN_(\d{3})/gi, (match) => getCanonicalCityName(match.toUpperCase(), match));
    body = body.replace(/KARN_(\d{3})/gi, (match) => getCanonicalCityName(match.toUpperCase(), match));
    if (a.location_id) {
      const cityName = getCanonicalCityName(a.location_id, a.city_name);
      title = title.replace(new RegExp(a.location_id, 'gi'), cityName);
      body = body.replace(new RegExp(a.location_id, 'gi'), cityName);
    }

    return {
      id: a.id,
      severity,
      badgeLabel: a.badge_label || severity.toUpperCase(),
      title,
      body,
      source: a.source,
      timestamp: a.timestamp,
      icon: a.icon || 'alert-circle',
      category,
    };
  });
}
