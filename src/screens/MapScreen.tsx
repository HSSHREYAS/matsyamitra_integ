/**
 * MapScreen — Marine Chartplotter Navigation with Fishing/Risk zone toggle,
 * Dynamic departure port anchoring, Top 3 PFZ Multi-Criteria Recommendations,
 * and realistic multi-leg nautical sea routing.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  marineChartMapStyle,
} from '../theme';
import ZoneToggle from '../components/map/ZoneToggle';
import MapControls from '../components/map/MapControls';
import { renderFishingZoneElements } from '../components/map/FishingZoneOverlay';
import { renderRiskZoneElements } from '../components/map/RiskZoneOverlay';
import FishingBottomSheet from '../components/map/FishingBottomSheet';
import RiskBottomSheet from '../components/map/RiskBottomSheet';
import FishermanRouteView from '../components/map/FishermanRouteView';
import LocationSelectorModal from '../components/home/LocationSelectorModal';
import {
  mockRiskZones,
  mapInitialRegion,
} from '../data/mockZones';
import type { FishingZone, RiskZone } from '../data/mockZones';
import {
  useCurrentState,
  useAdvisories,
  transformIncoisToFishingZones,
  transformCurrentStatesToFishingZones,
  transformCurrentStatesToRiskZones,
  getLandingCenterCoordinates,
  CANONICAL_PORT_COORDINATES,
  getCanonicalCityName,
} from '../services/api';
import {
  getUserProfile,
  saveUserProfile,
  type UserProfile,
} from '../services/storage/userProfileStorage';
import {
  getTop3RecommendedZones,
  type RecommendedPfzZone,
} from '../services/navigation/pfzRecommendationEngine';
import {
  generateRealisticSeaRoute,
  type RealisticSeaRoute,
} from '../services/navigation/nauticalRoutingEngine';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

const ZOOM_STEP = 0.5;
const MIN_DELTA = 0.02;
const MAX_LATITUDE_DELTA = 30;
const MAX_LONGITUDE_DELTA = 30;

const MapScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeMode, setActiveMode] = useState(0); // 0 = Fishing, 1 = Risk
  const [region, setRegion] = useState<Region>(mapInitialRegion);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isPortModalVisible, setIsPortModalVisible] = useState(false);
  const [sheetSnapIndex, setSheetSnapIndex] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false); // Tracks Google Maps style navigation state
  const mapRef = useRef<MapView>(null);

  // Active departure port (synced with userProfile or fallback to Malpe KARN_018)
  const [activePortId, setActivePortId] = useState<string>('KARN_018');
  const [activePortName, setActivePortName] = useState<string>('Malpe');

  // Live telemetry hook (25 canonical locations)
  const { states, isOnline: statesOnline, refresh: refreshStates } = useCurrentState(activePortId);

  // Live INCOIS Advisories hook (29 real PFZ advisories)
  const { rawAdvisories, isOnline: advisoriesOnline, refresh: refreshAdvisories } = useAdvisories();

  const isOnline = statesOnline || advisoriesOnline;

  // Load and synchronize user profile on mount and focus
  const loadProfile = useCallback(async () => {
    try {
      const p = await getUserProfile();
      setUserProfile(p);
      if (p.defaultPortId && p.defaultPortName) {
        setActivePortId(p.defaultPortId);
        setActivePortName(p.defaultPortName);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
      refreshStates();
      refreshAdvisories();
    });
    return unsubscribe;
  }, [navigation, loadProfile, refreshStates, refreshAdvisories]);

  // Active departure port coordinates
  const departurePortCoords = useMemo(() => {
    if (CANONICAL_PORT_COORDINATES[activePortId]) {
      return CANONICAL_PORT_COORDINATES[activePortId];
    }
    return getLandingCenterCoordinates(activePortName);
  }, [activePortId, activePortName]);

  // Compute live fishing zones with real INCOIS navigation vectors
  const fishingZones = useMemo<FishingZone[]>(() => {
    if (rawAdvisories && rawAdvisories.length > 0) {
      return transformIncoisToFishingZones(rawAdvisories, states || undefined);
    }
    if (states && states.length > 0) {
      return transformCurrentStatesToFishingZones(states);
    }
    return [];
  }, [rawAdvisories, states]);

  // Compute Top 3 Recommended Zones for the active departure port
  const top3RecommendedZones = useMemo<RecommendedPfzZone[]>(() => {
    if (fishingZones.length === 0) return [];
    return getTop3RecommendedZones(fishingZones, {
      id: activePortId,
      name: activePortName,
      coordinates: departurePortCoords,
    });
  }, [fishingZones, activePortId, activePortName, departurePortCoords]);

  // Compute live risk zones from 25 canonical points (or fallback)
  const riskZones = useMemo<RiskZone[]>(() => {
    if (states && states.length > 0) {
      const liveZones = transformCurrentStatesToRiskZones(states);
      if (liveZones.length > 0) return liveZones;
    }
    return mockRiskZones;
  }, [states]);

  const [selectedFishingZone, setSelectedFishingZone] = useState<FishingZone | null>(null);
  const [selectedRiskZone, setSelectedRiskZone] = useState<RiskZone | null>(null);

  // Auto-select #1 Top Recommended Zone whenever departure port or zones change
  useEffect(() => {
    if (top3RecommendedZones.length > 0) {
      if (!selectedFishingZone || !fishingZones.some((z) => z.id === selectedFishingZone.id)) {
        setSelectedFishingZone(top3RecommendedZones[0].zone);
      }
    } else if (fishingZones.length > 0 && !selectedFishingZone) {
      setSelectedFishingZone(fishingZones[0]);
    }
  }, [top3RecommendedZones, fishingZones, selectedFishingZone]);

  // Compute active realistic sea route from selected zone and active departure port
  const activeRealisticRoute = useMemo<RealisticSeaRoute | null>(() => {
    if (!selectedFishingZone) return null;

    // Check if the selected zone is one of the top 3 recommendations
    const matchingRec = top3RecommendedZones.find((r) => r.zone.id === selectedFishingZone.id);
    if (matchingRec) {
      return matchingRec.realisticRoute;
    }

    // Otherwise generate realistic route dynamically
    return generateRealisticSeaRoute({
      originPortId: activePortId,
      originPortName: activePortName,
      originCoords: departurePortCoords,
      targetPfzId: selectedFishingZone.id,
      targetPfzName: selectedFishingZone.name,
      targetPfzCoords: selectedFishingZone.center,
    });
  }, [selectedFishingZone, top3RecommendedZones, activePortId, activePortName, departurePortCoords]);

  // Find fleet crowding info for the selected zone
  const activeCrowdInfo = useMemo(() => {
    if (!selectedFishingZone) return null;
    const matchingRec = top3RecommendedZones.find((r) => r.zone.id === selectedFishingZone.id);
    if (matchingRec) {
      return {
        count: matchingRec.vesselCountEstimate,
        level: matchingRec.crowdLevel,
        labelKn: matchingRec.crowdLabelKn,
      };
    }
    return {
      count: 6,
      level: 'low' as const,
      labelKn: 'ಕಡಿಮೆ ದೋಣಿಗಳು (ಶಾಂತ ವಲಯ)',
    };
  }, [selectedFishingZone, top3RecommendedZones]);

  // Camera framing helper for a route
  const frameRoute = useCallback((route: RealisticSeaRoute) => {
    if (!route || route.coordinates.length < 2) return;
    const coords = route.coordinates;
    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLon = coords[0].longitude;
    let maxLon = coords[0].longitude;

    for (const c of coords) {
      minLat = Math.min(minLat, c.latitude);
      maxLat = Math.max(maxLat, c.latitude);
      minLon = Math.min(minLon, c.longitude);
      maxLon = Math.max(maxLon, c.longitude);
    }

    const midLat = (minLat + maxLat) / 2;
    const midLon = (minLon + maxLon) / 2;
    const latDelta = Math.max(0.65, (maxLat - minLat) * 1.55);
    const lonDelta = Math.max(0.65, (maxLon - minLon) * 1.55);

    mapRef.current?.animateToRegion({
      latitude: midLat,
      longitude: midLon,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    }, 550);
  }, []);

  // Handle switching departure port
  const handleSelectPort = useCallback(async (portId: string) => {
    const cityName = getCanonicalCityName(portId);
    setActivePortId(portId);
    setActivePortName(cityName);
    setIsPortModalVisible(false);

    // Persist as user's profile port
    try {
      await saveUserProfile({
        defaultPortId: portId,
        defaultPortName: cityName,
      });
      setUserProfile((prev) => (prev ? { ...prev, defaultPortId: portId, defaultPortName: cityName } : null));
    } catch {
      // ignore
    }

    // Recenter camera on the new port and offshore area
    const coords = CANONICAL_PORT_COORDINATES[portId] || getLandingCenterCoordinates(cityName);
    mapRef.current?.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude - 0.25,
      latitudeDelta: 1.1,
      longitudeDelta: 1.1,
    }, 500);
  }, []);

  // Handle selecting one of the Top 3 cards
  const handleSelectRecommendedZone = useCallback((rec: RecommendedPfzZone) => {
    setSelectedFishingZone(rec.zone);
    frameRoute(rec.realisticRoute);
  }, [frameRoute]);

  const handleZoomIn = async () => {
    try {
      const camera = await mapRef.current?.getCamera();
      if (camera && typeof camera.zoom === 'number') {
        mapRef.current?.animateCamera(
          { zoom: Math.min(camera.zoom + 1, 19) },
          { duration: 250 }
        );
        return;
      }
    } catch {
      // fallback
    }
    const nextRegion = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta * ZOOM_STEP, MIN_DELTA),
      longitudeDelta: Math.max(region.longitudeDelta * ZOOM_STEP, MIN_DELTA),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  const handleZoomOut = async () => {
    try {
      const camera = await mapRef.current?.getCamera();
      if (camera && typeof camera.zoom === 'number') {
        mapRef.current?.animateCamera(
          { zoom: Math.max(camera.zoom - 1, 4) },
          { duration: 250 }
        );
        return;
      }
    } catch {
      // fallback
    }
    const nextRegion = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta / ZOOM_STEP, MAX_LATITUDE_DELTA),
      longitudeDelta: Math.min(region.longitudeDelta / ZOOM_STEP, MAX_LONGITUDE_DELTA),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  const handleMyLocation = () => {
    const coords = departurePortCoords;
    const targetRegion = {
      latitude: coords.latitude,
      longitude: coords.longitude - 0.2, // Offset offshore to view navigation vectors
      latitudeDelta: 1.2,
      longitudeDelta: 1.2,
    };
    setRegion(targetRegion);
    mapRef.current?.animateToRegion(targetRegion, 500);
  };

  const handleFishingZonePress = useCallback((zone: FishingZone) => {
    setSelectedFishingZone(zone);
    const route = generateRealisticSeaRoute({
      originPortId: activePortId,
      originPortName: activePortName,
      originCoords: departurePortCoords,
      targetPfzId: zone.id,
      targetPfzName: zone.name,
      targetPfzCoords: zone.center,
    });
    frameRoute(route);
  }, [activePortId, activePortName, departurePortCoords, frameRoute]);

  const handleRiskZonePress = useCallback((zone: RiskZone) => {
    setSelectedRiskZone(zone);
  }, []);

  const handleRefresh = async () => {
    await Promise.all([refreshStates(), refreshAdvisories(), loadProfile()]);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBackground} />

      {/* =========================================================================
          TOP BAR (HIDDEN WHEN NAVIGATING)
      ========================================================================= */}
      {!isNavigating && (
        <View style={styles.topBar}>
          <View style={styles.leftAction}>
            <Icon name="compass-outline" size={22} color={Colors.primaryAccent} />
          </View>

          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.topBarTitle}>Marine Chartplotter</Text>
              <View style={styles.chartTag}>
                <Text style={styles.chartTagText}>ECDIS</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsPortModalVisible(true)}
              style={styles.subStatusRow}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: isOnline ? Colors.safe : Colors.caution },
                ]}
              />
              <Text style={styles.subStatusText}>
                Departure: <Text style={styles.portHighlight}>{activePortName}</Text>
              </Text>
              <Icon name="menu-down" size={16} color={Colors.oceanBlue} />
            </TouchableOpacity>
          </View>

          <View style={styles.topActionsRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSatellite(!isSatellite)}
              style={[styles.actionIconBtn, isSatellite && styles.actionIconBtnActive]}>
              <Icon
                name={isSatellite ? 'earth' : 'map-clock'}
                size={20}
                color={isSatellite ? '#FFFFFF' : Colors.oceanBlue}
              />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleRefresh} style={styles.actionIconBtn}>
              <Icon name="refresh" size={20} color={Colors.primaryAccent} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Map View Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapInitialRegion}
          mapType={isSatellite ? 'satellite' : 'standard'}
          customMapStyle={isSatellite ? undefined : (marineChartMapStyle as any)}
          toolbarEnabled={false}
          zoomEnabled={true}
          zoomControlEnabled={false}
          zoomTapEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
          scrollDuringRotateOrZoomEnabled={true}
          showsScale={true}
          showsCompass={true}
          minZoomLevel={4}
          maxZoomLevel={19}
          moveOnMarkerPress={false}
          onRegionChangeComplete={setRegion}>
          {activeMode === 0 &&
            renderFishingZoneElements(
              fishingZones,
              selectedFishingZone?.id,
              handleFishingZonePress,
              activeRealisticRoute,
              isNavigating,
              top3RecommendedZones.map(r => r.zone.id)
            )}
          {activeMode === 1 &&
            renderRiskZoneElements(riskZones, handleRiskZonePress)}
        </MapView>

        {/* Zone Toggle (Fishing vs Risk) */}
        {!isNavigating && <ZoneToggle activeIndex={activeMode} onToggle={setActiveMode} />}

        {/* Map Controls */}
        {!isNavigating && (
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onMyLocation={handleMyLocation}
            onToggleLayer={() => setIsSatellite(!isSatellite)}
            isSatellite={isSatellite}
          />
        )}

        {/* Risk Legend (only shown in Risk mode) */}
        {activeMode === 1 && (
          <View style={styles.legendCard}>
            <View style={styles.legendHeader}>
              <View style={styles.layerIndicator} />
              <Text style={styles.legendLabel}>LAYER ACTIVE</Text>
            </View>
            <Text style={styles.legendTitle}>Risk Zones</Text>
            <Text style={styles.legendSubtitle}>Real-time telemetry data</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.legendItemText}>Critical Wave Hazards</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.caution }]} />
                <Text style={styles.legendItemText}>Moderate Swell</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.safe }]} />
                <Text style={styles.legendItemText}>Optimal Marine Conditions</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* =========================================================================
          FISHERMAN ROUTE VIEW (BOTTOM PANEL & NAV BAR)
      ========================================================================= */}
      {activeMode === 0 ? (
        <FishermanRouteView
          recommendedZones={top3RecommendedZones}
          selectedZone={
            top3RecommendedZones.find((z) => z.zone.id === selectedFishingZone?.id) ||
            (selectedFishingZone && activeRealisticRoute
              ? {
                  zone: selectedFishingZone,
                  rank: 1 as 1 | 2 | 3,
                  score: 0,
                  distanceNm: activeRealisticRoute.totalDistanceNm,
                  realisticRoute: activeRealisticRoute,
                  badgeLabel: 'Selected Zone',
                  badgeLabelKn: 'ಆಯ್ಕೆಮಾಡಿದ ವಲಯ', // Selected Zone
                  badgeVariant: 'teal',
                  crowdLevel: activeCrowdInfo?.level || 'low',
                  crowdLabel: 'Low Traffic',
                  crowdLabelKn: activeCrowdInfo?.labelKn || 'ಕಡಿಮೆ ದೋಣಿಗಳು',
                  vesselCountEstimate: activeCrowdInfo?.count || 0,
                  distanceKm: activeRealisticRoute.totalDistanceKm,
                }
              : null)
          }
          activeRoute={activeRealisticRoute}
          isNavigating={isNavigating}
          onSelectZone={handleSelectRecommendedZone}
          onStartNavigation={() => {
            setIsNavigating(true);
            if (activeRealisticRoute) {
              frameRoute(activeRealisticRoute);
            }
          }}
          onExitNavigation={() => setIsNavigating(false)}
          departurePortName={activePortName}
        />
      ) : (
        <RiskBottomSheet selectedZone={selectedRiskZone} />
      )}

      {/* 25 Canonical Coastal Ports Selector Modal */}
      <LocationSelectorModal
        visible={isPortModalVisible}
        onClose={() => setIsPortModalVisible(false)}
        onSelectLocation={handleSelectPort}
        selectedLocationId={activePortId}
        states={states || []}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 25,
    ...Shadows.card,
  },
  leftAction: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarTitle: {
    ...Typography.screenTitle,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chartTag: {
    backgroundColor: '#0A2540',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  chartTagText: {
    fontSize: 9,
    color: '#38BDF8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subStatusText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  portHighlight: {
    color: Colors.oceanBlue,
    fontWeight: '800',
  },
  topActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconBtnActive: {
    backgroundColor: Colors.oceanBlue,
    borderColor: Colors.oceanBlue,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  legendCard: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 175,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    zIndex: 10,
    ...Shadows.card,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  layerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  legendLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  legendTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  legendSubtitle: {
    ...Typography.chip,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  legendItems: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendItemText: {
    ...Typography.chip,
    color: Colors.textPrimary,
  },
});

export default MapScreen;
