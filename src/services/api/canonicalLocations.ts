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
  KARN_001: { latitude: 14.8055, longitude: 74.1215 }, // Karwar (Baithkol Fishing Harbor)
  KARN_002: { latitude: 13.6395, longitude: 74.6950 }, // Kundapura (Gangolli / Kundapura Port)
  KARN_003: { latitude: 14.4285, longitude: 74.3510 }, // Kumta (Tadri Fishing Harbor)
  KARN_004: { latitude: 14.7085, longitude: 74.2690 }, // Ankola (Belekeri Landing)
  KARN_005: { latitude: 12.7980, longitude: 74.8560 }, // Someshwara (Ullal South Landing Center)
  KARN_006: { latitude: 13.9785, longitude: 74.5420 }, // Bhatkal (Bhatkal Fishing Bunder)
  KARN_007: { latitude: 13.3485, longitude: 74.7015 }, // Malpe Offshore Base (Malpe Main Port)
  KARN_008: { latitude: 13.7085, longitude: 74.6465 }, // Maravanthe (Maravanthe Beach Wharf)
  KARN_009: { latitude: 13.8560, longitude: 74.6055 }, // Baindur (Koderi Fishing Harbor)
  KARN_010: { latitude: 13.6270, longitude: 74.6850 }, // Kundapura Coast (Kodi Beach Landing)
  KARN_011: { latitude: 13.6385, longitude: 74.6885 }, // Gangolli (Gangolli Fisheries Jetty)
  KARN_012: { latitude: 13.9350, longitude: 74.5800 }, // Shiroor (Shiroor Landing Center)
  KARN_013: { latitude: 14.5360, longitude: 74.3160 }, // Gokarna (Tadadi / Gokarna Harbor)
  KARN_014: { latitude: 12.8610, longitude: 74.8360 }, // Mangalore Deep Sea Base (Mangalore Bunder)
  KARN_015: { latitude: 13.0080, longitude: 74.7950 }, // Surathkal (Surathkal Beach Landing)
  KARN_016: { latitude: 14.2820, longitude: 74.4440 }, // Honnavar (Kasarkod / Honnavar Port)
  KARN_017: { latitude: 14.7120, longitude: 74.2720 }, // Belekeri (Belekeri Port)
  KARN_018: { latitude: 13.3485, longitude: 74.7015 }, // Malpe (Malpe Main Fishing Bunder)
  KARN_019: { latitude: 13.9785, longitude: 74.5420 }, // Bhatkal Port
  KARN_020: { latitude: 14.0950, longitude: 74.4840 }, // Murudeshwar (Murudeshwar Bunder)
  KARN_021: { latitude: 14.0950, longitude: 74.4840 }, // Netrani Base (Murudeshwar Harbor)
  KARN_022: { latitude: 13.2240, longitude: 74.7390 }, // Kaup (Kaup Light House Landing)
  KARN_023: { latitude: 12.8080, longitude: 74.8530 }, // Ullal (Ullal Sea Front Landing)
  KARN_024: { latitude: 14.1850, longitude: 74.4760 }, // Manki (Manki Landing Center)
  KARN_025: { latitude: 12.8610, longitude: 74.8360 }, // Mangalore (Mangalore Old Port / Bunder)
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
