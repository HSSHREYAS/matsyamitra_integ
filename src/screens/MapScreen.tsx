/**
 * MapScreen — Marine Navigation with Fishing/Risk zone toggle
 * Connected to live MatsyaMitra 25 canonical locations telemetry & INCOIS PFZ advisories.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import ZoneToggle from '../components/map/ZoneToggle';
import MapControls from '../components/map/MapControls';
import { renderFishingZoneElements } from '../components/map/FishingZoneOverlay';
import { renderRiskZoneElements } from '../components/map/RiskZoneOverlay';
import FishingBottomSheet from '../components/map/FishingBottomSheet';
import RiskBottomSheet from '../components/map/RiskBottomSheet';
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
} from '../services/api';
import { getUserProfile, type UserProfile } from '../services/storage/userProfileStorage';
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
  const mapRef = useRef<MapView>(null);

  // Live telemetry hook (25 canonical locations)
  const { states, isOnline: statesOnline, refresh: refreshStates } = useCurrentState('KARN_001');

  // Live INCOIS Advisories hook (29 real PFZ advisories)
  const { rawAdvisories, isOnline: advisoriesOnline, refresh: refreshAdvisories } = useAdvisories();

  const isOnline = statesOnline || advisoriesOnline;

  // Load and synchronize user profile on mount and focus
  const loadProfile = useCallback(async () => {
    try {
      const p = await getUserProfile();
      setUserProfile(p);
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

  // Auto-select initial zone: prefer zone nearest to user's default port
  useEffect(() => {
    if (fishingZones.length > 0) {
      if (!selectedFishingZone || !fishingZones.some((z) => z.id === selectedFishingZone.id)) {
        const homePortName = userProfile?.defaultPortName?.toLowerCase();
        const preferredZone = homePortName
          ? fishingZones.find((z) =>
              z.navigationVector?.originPortName.toLowerCase().includes(homePortName) ||
              z.name.toLowerCase().includes(homePortName)
            )
          : null;

        setSelectedFishingZone(preferredZone || fishingZones[0]);
      }
    } else {
      setSelectedFishingZone(null);
    }
  }, [fishingZones, selectedFishingZone, userProfile]);

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
      // fallback to region calculation
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
      // fallback to region calculation
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
    if (userProfile?.defaultPortName) {
      const coords = getLandingCenterCoordinates(userProfile.defaultPortName);
      const targetRegion = {
        latitude: coords.latitude,
        longitude: coords.longitude - 0.2, // Offset offshore to view vectors
        latitudeDelta: 1.2,
        longitudeDelta: 1.2,
      };
      setRegion(targetRegion);
      mapRef.current?.animateToRegion(targetRegion, 500);
      return;
    }
    setRegion(mapInitialRegion);
    mapRef.current?.animateToRegion(mapInitialRegion, 500);
  };

  const handleFishingZonePress = useCallback((zone: FishingZone) => {
    setSelectedFishingZone(zone);
    if (zone.navigationVector) {
      const midLat = (zone.navigationVector.originPortCoordinates.latitude + zone.center.latitude) / 2;
      const midLon = (zone.navigationVector.originPortCoordinates.longitude + zone.center.longitude) / 2;
      const latDiff = Math.abs(zone.navigationVector.originPortCoordinates.latitude - zone.center.latitude);
      const lonDiff = Math.abs(zone.navigationVector.originPortCoordinates.longitude - zone.center.longitude);
      mapRef.current?.animateToRegion({
        latitude: midLat,
        longitude: midLon,
        latitudeDelta: Math.max(0.9, latDiff * 1.8),
        longitudeDelta: Math.max(0.9, lonDiff * 1.8),
      }, 450);
    } else {
      mapRef.current?.animateToRegion({
        latitude: zone.center.latitude,
        longitude: zone.center.longitude,
        latitudeDelta: 0.8,
        longitudeDelta: 0.8,
      }, 450);
    }
  }, []);

  const handleRiskZonePress = useCallback((zone: RiskZone) => {
    setSelectedRiskZone(zone);
  }, []);

  const handleRefresh = async () => {
    await Promise.all([refreshStates(), refreshAdvisories(), loadProfile()]);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.leftAction}>
          <Icon name="navigation-variant" size={24} color={Colors.primaryAccent} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Marine Navigation</Text>
          <View style={styles.subStatusRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isOnline ? Colors.safe : Colors.caution },
              ]}
            />
            <Text style={styles.subStatusText}>
              {fishingZones.length > 0
                ? `${fishingZones.length} INCOIS PFZs Active`
                : isOnline
                ? '25 Canonical Stations Online'
                : 'Offline / Cached Mode'}
              {userProfile?.defaultPortName ? ` • ${userProfile.defaultPortName}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={22} color={Colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapInitialRegion}
          mapType="standard"
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
              handleFishingZonePress
            )}
          {activeMode === 1 &&
            renderRiskZoneElements(riskZones, handleRiskZonePress)}
        </MapView>

        {/* Zone Toggle */}
        <ZoneToggle activeIndex={activeMode} onToggle={setActiveMode} />

        {/* Map Controls */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onMyLocation={handleMyLocation}
        />

        {/* Empty PFZ Banner (shown in Fishing mode when no live PFZ data is available yet) */}
        {activeMode === 0 && fishingZones.length === 0 && (
          <View style={styles.emptyPfzBanner}>
            <View style={styles.emptyPfzHeader}>
              <Icon name="satellite-variant" size={18} color={Colors.primaryAccent} />
              <Text style={styles.emptyPfzTitle}>PFZ TELEMETRY PENDING</Text>
            </View>
            <Text style={styles.emptyPfzText}>
              Connecting to INCOIS advisory server... Live fishing-zone vectors will appear once synchronized.
            </Text>
          </View>
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

      {/* Bottom Sheet */}
      {activeMode === 0 ? (
        <FishingBottomSheet selectedZone={selectedFishingZone} />
      ) : (
        <RiskBottomSheet selectedZone={selectedRiskZone} />
      )}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 20,
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
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subStatusText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyPfzBanner: {
    position: 'absolute',
    top: 90,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryAccent,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    zIndex: 10,
    ...Shadows.card,
  },
  emptyPfzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emptyPfzTitle: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyPfzText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  legendCard: {
    position: 'absolute',
    top: 90,
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
