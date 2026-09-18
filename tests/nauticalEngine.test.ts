/**
 * Unit tests for Nautical Sea Routing Engine and PFZ Recommendation Engine
 */

import {
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  projectNauticalPoint,
  generateRealisticSeaRoute,
} from '../src/services/navigation/nauticalRoutingEngine';
import {
  getTop3RecommendedZones,
} from '../src/services/navigation/pfzRecommendationEngine';
import type { FishingZone } from '../src/data/mockZones';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting Nautical Routing & Recommendation Engine Unit Tests...');

// Test 1: Distance & Bearing calculations
const malpeBerth = { latitude: 13.343755, longitude: 74.666625 };
const offshorePfz = { latitude: 13.50, longitude: 74.10 };

const dist = calculateHaversineDistanceKm(malpeBerth, offshorePfz);
console.log(`✓ Distance Malpe to PFZ: ${dist.toFixed(2)} km (${(dist / 1.852).toFixed(2)} NM)`);
assert(dist > 50 && dist < 80, `Expected distance between 50 and 80 km, got ${dist}`);

const bearing = calculateBearingDegrees(malpeBerth, offshorePfz);
console.log(`✓ Bearing Malpe to PFZ: ${bearing.toFixed(1)}°`);
assert(bearing > 270 && bearing < 330, `Expected bearing WNW (~290°), got ${bearing}`);

// Test 2: Project nautical point
const projected = projectNauticalPoint(malpeBerth, 270, 5); // 5 NM West
assert(projected.longitude < malpeBerth.longitude, 'Expected longitude to decrease when projecting West');
console.log(`✓ Projected 5 NM West: lat=${projected.latitude}, lon=${projected.longitude}`);

// Test 3: Realistic Multi-Leg Sea Route Generation
const route = generateRealisticSeaRoute({
  originPortId: 'KARN_018',
  originPortName: 'Malpe',
  originCoords: malpeBerth,
  targetPfzId: 'pfz-001',
  targetPfzName: 'Malpe Deep Pelagic',
  targetPfzCoords: offshorePfz,
});

console.log(`✓ Generated Route ID: ${route.id}`);
console.log(`  Total Distance: ${route.totalDistanceNm} NM (${route.totalDistanceKm} km)`);
console.log(`  Est. Transit: ${route.totalDurationHours} hrs`);
console.log(`  Diesel Est.: ${route.estimatedDieselLiters} L (~₹${route.estimatedFuelCostInr})`);
console.log(`  Leg Count: ${route.legs.length}`);
assert(route.legs.length >= 4, `Expected at least 4 legs in multi-leg route, got ${route.legs.length}`);
assert(route.legs[0].type === 'harbor_exit', 'First leg must be harbor fairway exit');
assert(route.legs[1].type === 'shelf_clearance', 'Second leg must be coastal shelf clearance');
assert(route.estimatedDieselLiters > 0, 'Estimated diesel must be positive');

// Test 4: Top 3 PFZ Multi-Criteria Recommendation
const mockZones: FishingZone[] = [
  {
    id: 'zone-near',
    name: 'Malpe Inshore Front',
    sectorCode: 'SEC001',
    region: 'Karnataka Shelf',
    potential: 88,
    chlorophyll: 0.9,
    chlorophyllStatus: 'optimal',
    sst: 28.5,
    sstStatus: 'Front',
    coordinates: [],
    center: { latitude: 13.38, longitude: 74.45 }, // ~24 km from Malpe
    species: ['Mackerel'],
    fishingIntelligence: 'Good pelagic front',
  },
  {
    id: 'zone-mid',
    name: 'Kundapura Shelf Ridge',
    sectorCode: 'SEC002',
    region: 'Karnataka Shelf',
    potential: 94,
    chlorophyll: 1.2,
    chlorophyllStatus: 'optimal',
    sst: 28.2,
    sstStatus: 'Front',
    coordinates: [],
    center: { latitude: 13.65, longitude: 74.20 }, // ~60 km from Malpe
    species: ['Pomfret'],
    fishingIntelligence: 'Optimal chlorophyll',
  },
  {
    id: 'zone-far',
    name: 'Karwar Deep Pelagic',
    sectorCode: 'SEC003',
    region: 'North Karnataka',
    potential: 96,
    chlorophyll: 1.4,
    chlorophyllStatus: 'optimal',
    sst: 27.9,
    sstStatus: 'Front',
    coordinates: [],
    center: { latitude: 14.80, longitude: 73.20 }, // ~200 km from Malpe
    species: ['Tuna'],
    fishingIntelligence: 'Deep pelagic shelf',
  },
  {
    id: 'zone-south',
    name: 'Mangalore Trench',
    sectorCode: 'SEC004',
    region: 'South Karnataka',
    potential: 85,
    chlorophyll: 0.8,
    chlorophyllStatus: 'optimal',
    sst: 28.6,
    sstStatus: 'Front',
    coordinates: [],
    center: { latitude: 12.80, longitude: 74.40 }, // ~65 km from Malpe
    species: ['Sardine'],
    fishingIntelligence: 'Stable thermal front',
  },
];

const top3 = getTop3RecommendedZones(mockZones, {
  id: 'KARN_018',
  name: 'Malpe',
  coordinates: malpeBerth,
});

console.log(`✓ Top 3 Recommended Zones for Malpe:`);
top3.forEach((rec) => {
  console.log(`  #${rec.rank} [${rec.badgeLabel}] ${rec.zone.name} - Score: ${rec.score} - Dist: ${rec.distanceNm} NM - Crowd: ${rec.crowdLabelKn}`);
});

assert(top3.length === 3, `Expected top 3 zones, got ${top3.length}`);
assert(top3[0].rank === 1, 'First item must have rank 1');
assert(top3[0].realisticRoute !== undefined, 'Recommended zone must have an attached realistic route');
// The far zone (200km) should score lower due to distance penalty
assert(top3[0].zone.id !== 'zone-far', 'Far zone should not beat closer high-efficiency zones');

console.log('🎉 ALL NAUTICAL ENGINE TESTS PASSED SUCCESSFULLY!');
