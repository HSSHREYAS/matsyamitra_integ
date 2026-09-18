/**
 * Nautical Routing Engine for Marine Navigation (Karnataka Coast).
 * 
 * Replaces simplistic straight-line vectors with realistic multi-leg sea routes:
 * 1. Port Berth -> Harbor Channel Sea-Buoy (Breakwater Clearance)
 * 2. Harbor Exit -> Coastal Shelf Clearance Waypoint (Clearing 10-15m shoals & coastal islands)
 * 3. Open Ocean Steaming Leg -> PFZ Outer Ingress Waypoint
 * 4. Zone Arrival -> Tactical Trawling Circuit inside PFZ boundary
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteLeg {
  legIndex: number;
  type: 'harbor_exit' | 'shelf_clearance' | 'ocean_transit' | 'zone_trawl';
  title: string;
  titleKn: string;
  instruction: string;
  instructionKn: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  distanceKm: number;
  distanceNm: number;
  bearingDegrees: number;
  compassHeading: string;
  estMinutes: number;
}

export interface RealisticSeaRoute {
  id: string;
  originPortId: string;
  originPortName: string;
  targetPfzId: string;
  targetPfzName: string;
  coordinates: GeoPoint[]; // Full polyline array for MapView Polyline
  waypoints: {
    point: GeoPoint;
    name: string;
    type: 'origin' | 'breakwater' | 'shelf' | 'pfz_entry' | 'destination';
    icon: string;
  }[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDistanceNm: number;
  totalDurationHours: number;
  estimatedDieselLiters: number;
  estimatedFuelCostInr: number;
}

// Harbor Breakwater Seaward Exit Channels for Karnataka maritime centers
// Defined relative to harbor entrance to ensure vessels clear seaward groynes/bars
interface HarborFairway {
  portId: string;
  portName: string;
  breakwaterExitOffsetNm: number;
  breakwaterHeadingDeg: number; // Channel orientation clearing river mouth / breakwater
  shelfClearanceHeadingDeg: number; // Seaward heading to 15m depth contour
}

const HARBOR_FAIRWAYS: Record<string, HarborFairway> = {
  // Karwar (Baithkol / Kali estuary): Exit heading WSW ~250° to clear Oyster Rocks
  KARN_001: { portId: 'KARN_001', portName: 'Karwar', breakwaterExitOffsetNm: 1.8, breakwaterHeadingDeg: 250, shelfClearanceHeadingDeg: 275 },
  // Honnavar (Sharavati estuary): Exit heading W ~265° to clear dangerous bar
  KARN_016: { portId: 'KARN_016', portName: 'Honnavar', breakwaterExitOffsetNm: 2.0, breakwaterHeadingDeg: 265, shelfClearanceHeadingDeg: 280 },
  // Bhatkal: Exit heading WSW ~245°
  KARN_006: { portId: 'KARN_006', portName: 'Bhatkal Deep Sea', breakwaterExitOffsetNm: 1.5, breakwaterHeadingDeg: 245, shelfClearanceHeadingDeg: 270 },
  // Gangolli / Kundapura (Panchagangavali estuary): Exit WSW ~250°
  KARN_011: { portId: 'KARN_011', portName: 'Gangolli', breakwaterExitOffsetNm: 1.8, breakwaterHeadingDeg: 250, shelfClearanceHeadingDeg: 275 },
  KARN_002: { portId: 'KARN_002', portName: 'Kundapura', breakwaterExitOffsetNm: 1.8, breakwaterHeadingDeg: 250, shelfClearanceHeadingDeg: 275 },
  // Malpe Harbor: Exit WSW ~255° clearing North & South Breakwaters, then SW past St. Mary's Island
  KARN_018: { portId: 'KARN_018', portName: 'Malpe', breakwaterExitOffsetNm: 1.6, breakwaterHeadingDeg: 255, shelfClearanceHeadingDeg: 265 },
  // Mangalore (Old Port / Bunder / Netravati-Gurpur bar): Exit W ~265° past breakwaters
  KARN_025: { portId: 'KARN_025', portName: 'Mangalore', breakwaterExitOffsetNm: 1.9, breakwaterHeadingDeg: 265, shelfClearanceHeadingDeg: 275 },
};

/**
 * Calculates Great-Circle distance between two coordinates in Kilometers (Haversine formula).
 */
export function calculateHaversineDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes forward bearing in degrees (0° - 360°) from p1 to p2.
 */
export function calculateBearingDegrees(p1: GeoPoint, p2: GeoPoint): number {
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Projects a destination point given a starting point, bearing, and distance in Nautical Miles.
 */
export function projectNauticalPoint(start: GeoPoint, bearingDeg: number, distanceNm: number): GeoPoint {
  const R_NM = 3440.065; // Earth radius in Nautical Miles
  const distRatio = distanceNm / R_NM;
  const brngRad = (bearingDeg * Math.PI) / 180;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distRatio) +
    Math.cos(lat1) * Math.sin(distRatio) * Math.cos(brngRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brngRad) * Math.sin(distRatio) * Math.cos(lat1),
      Math.cos(distRatio) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: parseFloat(((lat2 * 180) / Math.PI).toFixed(5)),
    longitude: parseFloat(((lon2 * 180) / Math.PI).toFixed(5)),
  };
}

/**
 * Cardinal compass heading string from bearing degrees.
 */
export function getCompassHeading(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}

/**
 * Generates a realistic 4-leg nautical route from a departure port to an INCOIS PFZ.
 */
export function generateRealisticSeaRoute(params: {
  originPortId: string;
  originPortName: string;
  originCoords: GeoPoint;
  targetPfzId: string;
  targetPfzName: string;
  targetPfzCoords: GeoPoint;
  vesselCruisingSpeedKnots?: number; // default 10.5 knots (~19.5 km/h)
}): RealisticSeaRoute {
  const {
    originPortId,
    originPortName,
    originCoords,
    targetPfzId,
    targetPfzName,
    targetPfzCoords,
    vesselCruisingSpeedKnots = 10.5,
  } = params;

  // 1. Determine Harbor Fairway parameters
  const fairway = HARBOR_FAIRWAYS[originPortId] || {
    portId: originPortId,
    portName: originPortName,
    breakwaterExitOffsetNm: 1.5,
    breakwaterHeadingDeg: 260, // Default westward departure into Arabian Sea
    shelfClearanceHeadingDeg: 270,
  };

  // Leg 1: Port Berth -> Harbor Breakwater Sea Buoy (Channel Clearance)
  const breakwaterExitPoint = projectNauticalPoint(
    originCoords,
    fairway.breakwaterHeadingDeg,
    fairway.breakwaterExitOffsetNm
  );

  // Leg 2: Harbor Exit -> Coastal Shelf Clearance Waypoint (Avoids inshore rocks/sandbars)
  // Steers towards the general direction of the PFZ while maintaining 3-4 NM clearance from shore
  const directTargetBearing = calculateBearingDegrees(breakwaterExitPoint, targetPfzCoords);
  // Blend seaward clearance heading with target bearing so the boat safely rounds the coast
  const blendedShelfBearing = ((fairway.shelfClearanceHeadingDeg * 0.4) + (directTargetBearing * 0.6));
  const shelfClearancePoint = projectNauticalPoint(
    breakwaterExitPoint,
    blendedShelfBearing,
    3.5 // 3.5 NM offshore to clear 10-15m bathymetry
  );

  // Leg 3: Open Ocean Transit Leg
  // For long trips (> 20 NM), define an intermediate waypoint
  const oceanDistanceKm = calculateHaversineDistanceKm(shelfClearancePoint, targetPfzCoords);
  const midPoint: GeoPoint | null = oceanDistanceKm > 40
    ? {
        latitude: parseFloat(((shelfClearancePoint.latitude + targetPfzCoords.latitude) / 2).toFixed(5)),
        longitude: parseFloat(((shelfClearancePoint.longitude + targetPfzCoords.longitude) / 2).toFixed(5)),
      }
    : null;

  // Leg 4: Zone Entry & Trawl Circuit Pattern inside PFZ
  // Trawling pattern: 1.5 NM circuit along thermal front
  const trawlLeg1 = projectNauticalPoint(targetPfzCoords, (directTargetBearing + 60) % 360, 1.2);
  const trawlLeg2 = projectNauticalPoint(trawlLeg1, (directTargetBearing + 150) % 360, 1.4);

  // Assemble full polyline
  const fullCoordinates: GeoPoint[] = [
    originCoords,
    breakwaterExitPoint,
    shelfClearancePoint,
    ...(midPoint ? [midPoint] : []),
    targetPfzCoords,
    trawlLeg1,
    trawlLeg2,
    targetPfzCoords, // Loop back to center
  ];

  // Construct individual legs
  const legs: RouteLeg[] = [];

  // Helper to build leg
  const addLeg = (
    index: number,
    type: RouteLeg['type'],
    title: string,
    titleKn: string,
    inst: string,
    instKn: string,
    pStart: GeoPoint,
    pEnd: GeoPoint
  ) => {
    const distKm = calculateHaversineDistanceKm(pStart, pEnd);
    const distNm = distKm / 1.852;
    const brng = calculateBearingDegrees(pStart, pEnd);
    const speedKmH = vesselCruisingSpeedKnots * 1.852;
    const estMin = Math.round((distKm / speedKmH) * 60);

    legs.push({
      legIndex: index,
      type,
      title,
      titleKn,
      instruction: inst,
      instructionKn: instKn,
      startPoint: pStart,
      endPoint: pEnd,
      distanceKm: parseFloat(distKm.toFixed(1)),
      distanceNm: parseFloat(distNm.toFixed(1)),
      bearingDegrees: Math.round(brng),
      compassHeading: getCompassHeading(brng),
      estMinutes: Math.max(5, estMin),
    });
  };

  // Leg 1
  addLeg(
    1,
    'harbor_exit',
    'Harbor Fairway Channel',
    'ಹಾರ್ಬರ್ ನಿರ್ಗಮನ ಚಾನೆಲ್',
    `Proceed along marked breakwater channel to seaward fairway buoy at ${getCompassHeading(fairway.breakwaterHeadingDeg)}.`,
    `ಬ್ರೇಕ್‌ವಾಟರ್ ಚಾನೆಲ್ ಮೂಲಕ ಮುಕ್ತ ಸಮುದ್ರ ತಡೆಗೋಡೆ ದಾಟಿ ${getCompassHeading(fairway.breakwaterHeadingDeg)} ದಿಕ್ಕಿನಲ್ಲಿ ಚಲಿಸಿ.`,
    originCoords,
    breakwaterExitPoint
  );

  // Leg 2
  addLeg(
    2,
    'shelf_clearance',
    'Coastal Shelf Clearance',
    'ಕರಾವಳಿ ಆಳದ ತಿರುವು',
    `Steer ${getCompassHeading(blendedShelfBearing)} to clear shallow sandbars & nearshore reefs to 15m bathymetry contour.`,
    `ದಡದ ಬಂಡೆ ಮತ್ತು ಉಸುಕಿನ ದಂಡೆಗಳನ್ನು ತಪ್ಪಿಸಲು 15 ಮೀಟರ್ ಆಳದತ್ತ ${getCompassHeading(blendedShelfBearing)} ತಿರುವು ಪಡೆಯಿರಿ.`,
    breakwaterExitPoint,
    shelfClearancePoint
  );

  // Leg 3
  if (midPoint) {
    addLeg(
      3,
      'ocean_transit',
      'Ocean Transit Checkpoint',
      'ಮುಕ್ತ ಸಮುದ್ರ ಮಾರ್ಗ - 1',
      `Maintain compass heading ${getCompassHeading(calculateBearingDegrees(shelfClearancePoint, midPoint))} on deepwater transit track.`,
      `ಆಳ ಸಮುದ್ರದಲ್ಲಿ ಸ್ಥಿರ ವೇಗದಲ್ಲಿ ${getCompassHeading(calculateBearingDegrees(shelfClearancePoint, midPoint))} ದಿಕ್ಕಿನಲ್ಲಿ ಸಾಗಿ.`,
      shelfClearancePoint,
      midPoint
    );
    addLeg(
      4,
      'ocean_transit',
      'Zone Approach Vector',
      'ವಲಯ ಸಮೀಪದ ಮಾರ್ಗ',
      `Align approach heading ${getCompassHeading(calculateBearingDegrees(midPoint, targetPfzCoords))} toward PFZ boundary.`,
      `ಮೀನುಗಾರಿಕೆ ವಲಯದ ಗಡಿಯನ್ನು ${getCompassHeading(calculateBearingDegrees(midPoint, targetPfzCoords))} ದಿಕ್ಕಿನಿಂದ ಪ್ರವೇಶಿಸಿ.`,
      midPoint,
      targetPfzCoords
    );
  } else {
    addLeg(
      3,
      'ocean_transit',
      'Open Ocean Transit',
      'ಮುಕ್ತ ಸಮುದ್ರ ನೇರ ಪಯಣ',
      `Steer direct course ${getCompassHeading(directTargetBearing)} towards INCOIS PFZ coordinates.`,
      `INCOIS ಮೀನುಗಾರಿಕೆ ವಲಯದತ್ತ ನೇರವಾಗಿ ${getCompassHeading(directTargetBearing)} ದಿಕ್ಕಿನಲ್ಲಿ ಪಯಣಿಸಿ.`,
      shelfClearancePoint,
      targetPfzCoords
    );
  }

  // Leg 4 (or 5): Trawling circuit
  const lastLegIndex = legs.length + 1;
  addLeg(
    lastLegIndex,
    'zone_trawl',
    'Tactical Trawl Pattern',
    'ಮೀನುಗಾರಿಕೆ ಟ್ರ್ಯಾಕ್',
    `Execute thermal front sweep inside high-chlorophyll aggregation contour.`,
    `ಹೆಚ್ಚಿನ ಪ್ಲಾಂಕ್ಟನ್ ಇರುವ ನೀರಿನ ವಲಯದಲ್ಲಿ ಬಲೆ ಬೀಸಿ ಮೀನು ಹಿಡಿಯಿರಿ.`,
    targetPfzCoords,
    trawlLeg1
  );

  // Aggregate totals
  const totalDistanceKm = legs.reduce((acc, l) => acc + l.distanceKm, 0);
  const totalDistanceNm = totalDistanceKm / 1.852;
  const speedKmH = vesselCruisingSpeedKnots * 1.852;
  const totalDurationHours = parseFloat((totalDistanceKm / speedKmH).toFixed(1));

  // Fuel consumption:
  // Standard Karnataka mechanized fishing vessel (trawler/gillnetter ~100-120 HP):
  // Burn rate: ~0.72 L diesel per NM cruising + 8 L reserve for trawling
  const estimatedDieselLiters = Math.round(totalDistanceNm * 0.72 + 8);
  const estimatedFuelCostInr = Math.round(estimatedDieselLiters * 88); // ~₹88/L marine subsidized diesel

  return {
    id: `route-${originPortId}-${targetPfzId}`,
    originPortId,
    originPortName,
    targetPfzId,
    targetPfzName,
    coordinates: fullCoordinates,
    waypoints: [
      {
        point: originCoords,
        name: `${originPortName} Berth`,
        type: 'origin',
        icon: 'anchor',
      },
      {
        point: breakwaterExitPoint,
        name: 'Breakwater Fairway Buoy',
        type: 'breakwater',
        icon: 'ferry',
      },
      {
        point: shelfClearancePoint,
        name: 'Shelf Clearance Waypoint',
        type: 'shelf',
        icon: 'compass-outline',
      },
      {
        point: targetPfzCoords,
        name: `${targetPfzName} Center`,
        type: 'destination',
        icon: 'fish',
      },
    ],
    legs,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(1)),
    totalDistanceNm: parseFloat(totalDistanceNm.toFixed(1)),
    totalDurationHours,
    estimatedDieselLiters,
    estimatedFuelCostInr,
  };
}
