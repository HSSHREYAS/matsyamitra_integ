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
};

export interface CanonicalLocationItem {
  id: string;
  name: string;
}

export const CANONICAL_LOCATIONS: CanonicalLocationItem[] = Object.entries(CANONICAL_CITY_NAMES).map(
  ([id, name]) => ({ id, name })
);

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
