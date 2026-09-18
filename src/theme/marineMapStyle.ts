/**
 * Marine Chartplotter Map Styling for React Native Maps (Google Maps Android SDK).
 * Inspired by ECDIS / Navionics / Raymarine nautical chart displays:
 * - Emphasizes ocean bathymetry, coastlines, and maritime channels.
 * - Subdues terrestrial land clutter, turns off road networks, and removes commercial POIs.
 */

export const marineChartMapStyle = [
  // 1. Water styling — clear nautical maritime blue
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      { color: '#A0D2EB' }, // Crisp coastal marine chart blue
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [
      { color: '#034078' }, // Dark navy nautical water labels
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [
      { color: '#FFFFFF' },
      { weight: 2 },
    ],
  },

  // 2. Landscape / Continents — subdued neutral nautical chart slate
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [
      { color: '#EDF2F7' }, // Clean subdued off-white/slate
    ],
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [
      { color: '#E2E8F0' },
    ],
  },

  // 3. Coastlines and Shorelines — crisp definition
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [
      { color: '#64748B' },
      { weight: 1.2 },
    ],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [
      { color: '#475569' },
      { weight: 1.5 },
    ],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [
      { color: '#94A3B8' },
      { weight: 1 },
      { strokeDasharray: [2, 2] },
    ],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [
      { color: '#1E293B' },
      { weight: 600 },
    ],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [
      { color: '#FFFFFF' },
      { weight: 3 },
    ],
  },

  // 4. Roads & Highways — completely off to eliminate land traffic clutter
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [
      { visibility: 'off' },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [
      { visibility: 'off' },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [
      { visibility: 'off' },
    ],
  },

  // 5. Points of Interest (POIs) — off (except natural ports/harbors)
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [
      { visibility: 'off' },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      { color: '#DCFCE7' },
      { visibility: 'simplified' },
    ],
  },

  // 6. Transit — off
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [
      { visibility: 'off' },
    ],
  },
];

/**
 * Dark Nautical Night Mode Chartplotter (optional toggle for night fishing / reduced glare).
 */
export const marineNightChartMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#0B192C' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0B192C' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1E3E62' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38BDF8' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'road',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];
