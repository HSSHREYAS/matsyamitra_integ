/**
 * Mock Zone Data — Map Screen
 * Coordinates along Karnataka coast (~12°N–15°N, 74°E–77°E)
 */

export interface NavigationVector {
  originPortName: string;
  originPortCoordinates: { latitude: number; longitude: number };
  bearingDegrees: number;
  distanceKm: number;
  depthM: number;
}

export interface FishingZone {
  id: string;
  name: string;
  sectorCode: string;
  region: string;
  potential: number; // 0–100%
  chlorophyll: number;
  chlorophyllStatus: 'optimal' | 'moderate' | 'low';
  sst: number;
  sstStatus: string;
  coordinates: { latitude: number; longitude: number }[];
  center: { latitude: number; longitude: number };
  fishingIntelligence: string;
  species: string[];
  navigationVector?: NavigationVector;
}

export interface RiskZone {
  id: string;
  name: string;
  riskLevel: 'critical' | 'moderate' | 'low';
  waveHeight: number;
  windSpeed: number;
  description: string;
  center: { latitude: number; longitude: number };
  radius: number; // in meters
}

export const mockFishingZones: FishingZone[] = [
  {
    id: 'fz-1',
    name: 'Mangalore Coast',
    sectorCode: 'Zone 42-B',
    region: 'East Arabian Sea',
    potential: 94,
    chlorophyll: 0.45,
    chlorophyllStatus: 'optimal',
    sst: 28.5,
    sstStatus: 'WARM CURRENT',
    coordinates: [
      { latitude: 12.85, longitude: 74.75 },
      { latitude: 12.95, longitude: 74.70 },
      { latitude: 13.05, longitude: 74.72 },
      { latitude: 13.00, longitude: 74.85 },
      { latitude: 12.90, longitude: 74.83 },
    ],
    center: { latitude: 12.95, longitude: 74.78 },
    fishingIntelligence:
      'Thermal convergence detected. The upwelling phenomenon near Mangalore shelf indicates high nutrient density. Optimal conditions for Scombridae and Clupeidae concentrations.',
    species: ['Mackerel', 'Sardine', 'Tuna'],
  },
  {
    id: 'fz-2',
    name: 'Udupi Offshore',
    sectorCode: 'Zone 38-A',
    region: 'East Arabian Sea',
    potential: 78,
    chlorophyll: 0.38,
    chlorophyllStatus: 'moderate',
    sst: 27.8,
    sstStatus: 'STABLE',
    coordinates: [
      { latitude: 13.30, longitude: 74.60 },
      { latitude: 13.40, longitude: 74.55 },
      { latitude: 13.50, longitude: 74.58 },
      { latitude: 13.45, longitude: 74.70 },
      { latitude: 13.35, longitude: 74.68 },
    ],
    center: { latitude: 13.40, longitude: 74.62 },
    fishingIntelligence:
      'Moderate chlorophyll levels indicate secondary productivity. Good conditions for bottom trawling. Pomfret and prawn populations expected.',
    species: ['Pomfret', 'Prawn', 'Sole'],
  },
  {
    id: 'fz-3',
    name: 'Karwar Deep',
    sectorCode: 'Zone 55-C',
    region: 'North Karnataka Sea',
    potential: 65,
    chlorophyll: 0.30,
    chlorophyllStatus: 'moderate',
    sst: 27.2,
    sstStatus: 'COOL UPWELLING',
    coordinates: [
      { latitude: 14.75, longitude: 73.90 },
      { latitude: 14.85, longitude: 73.85 },
      { latitude: 14.95, longitude: 73.88 },
      { latitude: 14.90, longitude: 74.00 },
      { latitude: 14.80, longitude: 73.98 },
    ],
    center: { latitude: 14.85, longitude: 73.92 },
    fishingIntelligence:
      'Cool upwelling zone. Deep sea varieties likely present. Suitable for gill net operations targeting king mackerel.',
    species: ['King Mackerel', 'Seer Fish'],
  },
];

export const mockRiskZones: RiskZone[] = [
  {
    id: 'rz-1',
    name: 'Malpe Offshore',
    riskLevel: 'critical',
    waveHeight: 3.2,
    windSpeed: 28,
    description: 'High waves and strong winds near Malpe. Cyclonic conditions developing.',
    center: { latitude: 13.20, longitude: 74.40 },
    radius: 15000,
  },
  {
    id: 'rz-2',
    name: 'Karwar Coast',
    riskLevel: 'moderate',
    waveHeight: 2.1,
    windSpeed: 18,
    description: 'Moderate swell expected near Karwar. Caution for small vessels.',
    center: { latitude: 14.50, longitude: 74.10 },
    radius: 10000,
  },
  {
    id: 'rz-3',
    name: 'Mangalore Coast',
    riskLevel: 'low',
    waveHeight: 0.8,
    windSpeed: 8,
    description: 'Calm conditions near Mangalore. Safe for all vessel types.',
    center: { latitude: 12.70, longitude: 74.90 },
    radius: 8000,
  },
];

export const mapCoverage = {
  safeZones: 3,
  riskZones: 1,
  visibility: 12.4,
  visibilityUnit: 'nm',
  waterTemp: 14.2,
  waterTempUnit: '°C',
  tideHeight: 1.2,
  tideStatus: 'Low',
  visibilityStatus: 'Poor (<1nm)',
  currentCoordinate: '12.9°N, 74.8°E',
};

export const mapInitialRegion = {
  latitude: 13.90,
  longitude: 73.90,
  latitudeDelta: 2.2,
  longitudeDelta: 2.2,
};

export default { mockFishingZones, mockRiskZones, mapCoverage, mapInitialRegion };
