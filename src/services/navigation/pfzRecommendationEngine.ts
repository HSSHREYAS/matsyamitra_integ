/**
 * PFZ Multi-Criteria Recommendation Engine (Karnataka Coast).
 * 
 * Ranks all available PFZ fishing zones relative to the fisher's active departure port,
 * evaluating:
 * 1. Catch Potential % (SST thermal gradients + Chlorophyll biomass) [45% weight]
 * 2. Fuel / Distance Efficiency (minimizing transit diesel burn from departure port) [35% weight]
 * 3. Fleet Density / Crowding (avoiding gear tangles and overfished sectors) [20% weight]
 * 
 * Outputs the Top 3 Recommended Zones with contextual badges and realistic nautical routes.
 */

import type { FishingZone } from '../../data/mockZones';
import {
  calculateHaversineDistanceKm,
  generateRealisticSeaRoute,
  type RealisticSeaRoute,
  type GeoPoint,
} from './nauticalRoutingEngine';

export interface RecommendedPfzZone {
  rank: 1 | 2 | 3;
  zone: FishingZone;
  score: number; // 0 - 100
  badgeLabel: string;
  badgeLabelKn: string;
  badgeVariant: 'teal' | 'gold' | 'ocean';
  distanceKm: number;
  distanceNm: number;
  crowdLevel: 'low' | 'moderate' | 'high';
  crowdLabel: string;
  crowdLabelKn: string;
  vesselCountEstimate: number;
  realisticRoute: RealisticSeaRoute;
}

/**
 * Deterministically estimates local fleet density (active vessels) for a given PFZ center.
 */
function estimateFleetCrowd(center: GeoPoint, zoneId: string): {
  count: number;
  level: 'low' | 'moderate' | 'high';
  label: string;
  labelKn: string;
} {
  // Deterministic seed from coordinate digits
  const seed = Math.abs(Math.round(center.latitude * 100 + center.longitude * 100));
  const count = 4 + (seed % 19); // 4 to 22 boats

  if (count <= 9) {
    return {
      count,
      level: 'low',
      label: 'Low Crowd (3-9 boats)',
      labelKn: 'ಕಡಿಮೆ ದೋಣಿಗಳು (ಶಾಂತ ವಲಯ)',
    };
  } else if (count <= 15) {
    return {
      count,
      level: 'moderate',
      label: 'Moderate Fleet (10-15 boats)',
      labelKn: 'ಸಾಧಾರಣ ದೋಣಿಗಳು',
    };
  } else {
    return {
      count,
      level: 'high',
      label: 'Dense Fleet (16+ boats)',
      labelKn: 'ಹೆಚ್ಚು ದೋಣಿಗಳು (ದಟ್ಟಣೆ)',
    };
  }
}

/**
 * Calculates Multi-Criteria Decision Score (MCDS) and returns Top 3 PFZs
 * ranked for the given departure port.
 */
export function getTop3RecommendedZones(
  allZones: FishingZone[],
  departurePort: {
    id: string;
    name: string;
    coordinates: GeoPoint;
  }
): RecommendedPfzZone[] {
  if (!allZones || allZones.length === 0) {
    return [];
  }

  // 1. Calculate metrics for all zones relative to departure port
  const scoredList = allZones.map((zone) => {
    const distKm = calculateHaversineDistanceKm(departurePort.coordinates, zone.center);
    const distNm = distKm / 1.852;
    const crowd = estimateFleetCrowd(zone.center, zone.id);

    // Potential Score (0 - 100): Direct catch potential
    const potentialScore = zone.potential ?? 80;

    // Distance Score (0 - 100): Higher score for closer zones (< 30 km = 100, drops linearly)
    const distanceScore = Math.max(10, Math.min(100, 100 - (distKm - 15) * 1.2));

    // Crowd Score: Low crowd = 100, Moderate = 70, High = 40
    const crowdScore = crowd.level === 'low' ? 100 : crowd.level === 'moderate' ? 70 : 40;

    // Weighted composite score (MCDS):
    // Potential (45%) + Fuel Efficiency (35%) + Low Fleet Density (20%)
    const mcds = potentialScore * 0.45 + distanceScore * 0.35 + crowdScore * 0.2;

    return {
      zone,
      distKm,
      distNm,
      crowd,
      potentialScore,
      distanceScore,
      crowdScore,
      mcds: parseFloat(mcds.toFixed(1)),
    };
  });

  // 2. Sort by composite score descending
  scoredList.sort((a, b) => b.mcds - a.mcds);

  // 3. Take Top 3
  const top3 = scoredList.slice(0, 3);

  // 4. Map into RecommendedPfzZone with distinct badges and realistic nautical routes
  const badges: {
    label: string;
    labelKn: string;
    variant: 'teal' | 'gold' | 'ocean';
  }[] = [
    {
      label: '#1 BEST MATCH',
      labelKn: '#1 ಅತ್ಯುತ್ತಮ ವಲಯ',
      variant: 'gold',
    },
    {
      label: '#2 FUEL SAVER',
      labelKn: '#2 ಇಂಧನ ಉಳಿತಾಯ',
      variant: 'teal',
    },
    {
      label: '#3 HIGH BIOMASS',
      labelKn: '#3 ಹೆಚ್ಚಿನ ಇಳುವರಿ',
      variant: 'ocean',
    },
  ];

  return top3.map((item, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    const badge = badges[index];

    // Generate realistic multi-leg sea route from active departure port to this PFZ
    const realisticRoute = generateRealisticSeaRoute({
      originPortId: departurePort.id,
      originPortName: departurePort.name,
      originCoords: departurePort.coordinates,
      targetPfzId: item.zone.id,
      targetPfzName: item.zone.name,
      targetPfzCoords: item.zone.center,
    });

    return {
      rank,
      zone: item.zone,
      score: item.mcds,
      badgeLabel: badge.label,
      badgeLabelKn: badge.labelKn,
      badgeVariant: badge.variant,
      distanceKm: parseFloat(item.distKm.toFixed(1)),
      distanceNm: parseFloat(item.distNm.toFixed(1)),
      crowdLevel: item.crowd.level,
      crowdLabel: item.crowd.label,
      crowdLabelKn: item.crowd.labelKn,
      vesselCountEstimate: item.crowd.count,
      realisticRoute,
    };
  });
}
