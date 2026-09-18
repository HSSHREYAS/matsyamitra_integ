/**
 * Canonical 25 Karnataka Coastal Sampling Locations Mapping.
 * Maps internal KARN_001–KARN_025 identifiers to human-readable coastal city/harbour names.
 */

export const CANONICAL_CITY_NAMES: Record<string, string> = {
  KARN_001: 'Karwar',
  KARN_002: 'Kundapura',
  KARN_003: 'Kumta',
  KARN_004: 'Ankola',
  KARN_005: 'Someshwara',
  KARN_006: 'Bhatkal Deep Sea',
  KARN_007: 'Malpe Offshore',
  KARN_008: 'Maravanthe',
  KARN_009: 'Baindur',
  KARN_010: 'Kundapura Coast',
  KARN_011: 'Gangolli',
  KARN_012: 'Shiroor',
  KARN_013: 'Gokarna',
  KARN_014: 'Mangalore Deep Sea',
  KARN_015: 'Surathkal',
  KARN_016: 'Honnavar',
  KARN_017: 'Belekeri',
  KARN_018: 'Malpe',
  KARN_019: 'Bhatkal Offshore',
  KARN_020: 'Murudeshwar',
  KARN_021: 'Netrani Deep Sea',
  KARN_022: 'Kaup',
  KARN_023: 'Ullal Offshore',
  KARN_024: 'Manki',
  KARN_025: 'Mangalore',
};

export interface CanonicalLocationItem {
  id: string;
  name: string;
}

export const CANONICAL_LOCATIONS: CanonicalLocationItem[] = Object.entries(CANONICAL_CITY_NAMES).map(
  ([id, name]) => ({ id, name })
);

export const CANONICAL_PORT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  KARN_001: { latitude: 14.602642, longitude: 73.152614 }, // Karwar
  KARN_002: { latitude: 13.714424, longitude: 74.206417 }, // Kundapura
  KARN_003: { latitude: 14.252099, longitude: 73.284125 }, // Kumta
  KARN_004: { latitude: 14.576383, longitude: 73.371932 }, // Ankola
  KARN_005: { latitude: 12.656436, longitude: 74.245355 }, // Someshwara
  KARN_006: { latitude: 13.87657, longitude: 73.0982 }, // Bhatkal Deep Sea
  KARN_007: { latitude: 13.628876, longitude: 74.066202 }, // Malpe Offshore
  KARN_008: { latitude: 13.697208, longitude: 74.292278 }, // Maravanthe
  KARN_009: { latitude: 13.841149, longitude: 73.600926 }, // Baindur
  KARN_010: { latitude: 13.701877, longitude: 74.189533 }, // Kundapura Coast
  KARN_011: { latitude: 13.642529, longitude: 74.507275 }, // Gangolli
  KARN_012: { latitude: 13.819599, longitude: 74.118591 }, // Shiroor
  KARN_013: { latitude: 14.444009, longitude: 73.421502 }, // Gokarna
  KARN_014: { latitude: 12.360216, longitude: 73.587784 }, // Mangalore Deep Sea
  KARN_015: { latitude: 12.904593, longitude: 73.898817 }, // Surathkal
  KARN_016: { latitude: 14.288519, longitude: 73.69884 }, // Honnavar
  KARN_017: { latitude: 14.437228, longitude: 73.948746 }, // Belekeri
  KARN_018: { latitude: 13.343755, longitude: 74.666625 }, // Malpe
  KARN_019: { latitude: 13.722979, longitude: 73.496794 }, // Bhatkal Offshore
  KARN_020: { latitude: 14.117504, longitude: 73.262162 }, // Murudeshwar
  KARN_021: { latitude: 13.762229, longitude: 73.216743 }, // Netrani Deep Sea
  KARN_022: { latitude: 13.522264, longitude: 73.478449 }, // Kaup
  KARN_023: { latitude: 12.39785, longitude: 73.472452 }, // Ullal Offshore
  KARN_024: { latitude: 13.763693, longitude: 73.448016 }, // Manki
  KARN_025: { latitude: 12.896538, longitude: 74.71948 }, // Mangalore
};

/**
 * Returns the human-readable coastal city name for a given location ID,
 * guaranteeing no internal KARN_XXX ID is returned as a user-visible name.
 */
export function getCanonicalCityName(locationId?: string | null, fallbackCity?: string | null): string {
  if (fallbackCity && fallbackCity.trim() && !fallbackCity.toUpperCase().startsWith('KARN_')) {
    return fallbackCity.trim();
  }
  if (locationId) {
    const matched = CANONICAL_CITY_NAMES[locationId.toUpperCase()];
    if (matched) return matched;
  }
  return fallbackCity || 'Karnataka Coast';
}

/**
 * Looks up geographic coordinates for a landing center or location ID.
 */
export function getLandingCenterCoordinates(
  nameOrId?: string | null
): { latitude: number; longitude: number } {
  if (!nameOrId) {
    return CANONICAL_PORT_COORDINATES.KARN_018; // Default to Malpe
  }

  const clean = nameOrId.trim().toUpperCase();

  // 1. Exact match on KARN_XXX ID
  if (CANONICAL_PORT_COORDINATES[clean]) {
    return CANONICAL_PORT_COORDINATES[clean];
  }

  // 2. Match by canonical city name
  for (const [id, cityName] of Object.entries(CANONICAL_CITY_NAMES)) {
    if (cityName.toUpperCase() === clean || clean.includes(cityName.toUpperCase()) || cityName.toUpperCase().includes(clean)) {
      return CANONICAL_PORT_COORDINATES[id];
    }
  }

  // 3. Fallback to Malpe / Udupi central coast
  return CANONICAL_PORT_COORDINATES.KARN_018;
}

/**
 * Generates an organic 6-point bathymetric polygon around a PFZ center coordinate.
 * The polygon is oriented along the Karnataka continental shelf (NW-SE axis).
 */
export function generatePfzPolygon(
  centerLat: number,
  centerLon: number,
  seedOffset: number = 0
): { latitude: number; longitude: number }[] {
  // Shelf orientation: -30 degrees (NNW to SSE)
  const shelfAngleRad = (-30 * Math.PI) / 180;
  const cosTheta = Math.cos(shelfAngleRad);
  const sinTheta = Math.sin(shelfAngleRad);

  // Semi-major (along shelf) ~ 8-10 km (~0.075°), semi-minor (cross shelf) ~ 4-6 km (~0.045°)
  const a = 0.075 + ((seedOffset % 3) * 0.01);
  const b = 0.042 + ((seedOffset % 2) * 0.008);

  const points: { latitude: number; longitude: number }[] = [];
  const numVertices = 6;

  for (let i = 0; i < numVertices; i++) {
    const angle = (i * 2 * Math.PI) / numVertices;
    // Slight natural perturbation for organic coastline curvature
    const rFactor = 1 + 0.12 * Math.sin(angle * 3 + seedOffset);
    const u = a * Math.cos(angle) * rFactor;
    const v = b * Math.sin(angle) * rFactor;

    // Rotate by continental shelf orientation
    const dLon = u * cosTheta - v * sinTheta;
    const dLat = u * sinTheta + v * cosTheta;

    points.push({
      latitude: parseFloat((centerLat + dLat).toFixed(5)),
      longitude: parseFloat((centerLon + dLon).toFixed(5)),
    });
  }

  return points;
}
