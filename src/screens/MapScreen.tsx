/**
 * MapScreen — Marine Navigation with Fishing/Risk zone toggle
 * Connected to live MatsyaMitra 25 canonical locations telemetry.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import ZoneToggle from '../components/map/ZoneToggle';
import MapControls from '../components/map/MapControls';
import FishingZoneOverlay from '../components/map/FishingZoneOverlay';
import RiskZoneOverlay from '../components/map/RiskZoneOverlay';
import FishingBottomSheet from '../components/map/FishingBottomSheet';
import RiskBottomSheet from '../components/map/RiskBottomSheet';
import {
  mockRiskZones,
  mapInitialRegion,
} from '../data/mockZones';
import type { FishingZone, RiskZone } from '../data/mockZones';
import {
  useCurrentState,
  transformCurrentStatesToFishingZones,
  transformCurrentStatesToRiskZones,
} from '../services/api';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ZOOM_STEP = 0.5;
const MIN_DELTA = 0.02;
const MAX_LATITUDE_DELTA = 30;
const MAX_LONGITUDE_DELTA = 30;

const MapScreen: React.FC = () => {
  const [activeMode, setActiveMode] = useState(0); // 0 = Fishing, 1 = Risk
  const [region, setRegion] = useState<Region>(mapInitialRegion);
  const mapRef = useRef<MapView>(null);

  // Live telemetry hook
  const { states, isOnline, refresh } = useCurrentState('KARN_001');

  // Compute live fishing zones from 25 canonical points
  const fishingZones = useMemo<FishingZone[]>(() => {
    if (states && states.length > 0) {
      return transformCurrentStatesToFishingZones(states);
    }
    return [];
  }, [states]);

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

  useEffect(() => {
    if (fishingZones.length > 0) {
      if (!selectedFishingZone || !fishingZones.some((z) => z.id === selectedFishingZone.id)) {
        setSelectedFishingZone(fishingZones[0]);
      }
    } else {
      setSelectedFishingZone(null);
    }
  }, [fishingZones, selectedFishingZone]);

  const handleZoomIn = () => {
    const nextRegion = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta * ZOOM_STEP, MIN_DELTA),
      longitudeDelta: Math.max(region.longitudeDelta * ZOOM_STEP, MIN_DELTA),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  const handleZoomOut = () => {
    const nextRegion = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta / ZOOM_STEP, MAX_LATITUDE_DELTA),
      longitudeDelta: Math.min(region.longitudeDelta / ZOOM_STEP, MAX_LONGITUDE_DELTA),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  const handleMyLocation = () => {
    setRegion(mapInitialRegion);
    mapRef.current?.animateToRegion(mapInitialRegion, 500);
  };

  const handleFishingZonePress = useCallback((zone: FishingZone) => {
    setSelectedFishingZone(zone);
  }, []);

  const handleRiskZonePress = useCallback((zone: RiskZone) => {
    setSelectedRiskZone(zone);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Icon name="menu" size={24} color={Colors.textOnDark} />
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Marine Navigation</Text>
          <View style={styles.subStatusRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isOnline ? Colors.safe : Colors.textSubtleOnDark },
              ]}
            />
            <Text style={styles.subStatusText}>
              {isOnline ? '25 Canonical Points Active' : 'Offline / Mock Data'}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => refresh()}>
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
          rotateEnabled={false}
          onRegionChangeComplete={setRegion}>
          {activeMode === 0 && (
            <FishingZoneOverlay
              zones={fishingZones}
              onZonePress={handleFishingZonePress}
            />
          )}
          {activeMode === 1 && (
            <RiskZoneOverlay
              zones={riskZones}
              onZonePress={handleRiskZonePress}
            />
          )}
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
              PFZ data currently unavailable. Live fishing-zone data will appear when satellite/PFZ processing is available.
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
                <Text style={styles.legendItemText}>Critical</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.caution }]} />
                <Text style={styles.legendItemText}>Moderate</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.safe }]} />
                <Text style={styles.legendItemText}>Optimal Path</Text>
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
    backgroundColor: Colors.primaryBackground,
    zIndex: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subStatusText: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
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
    backgroundColor: 'rgba(10, 22, 40, 0.94)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryAccent,
    zIndex: 10,
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
    color: Colors.textSubtleOnDark,
    lineHeight: 18,
  },
  legendCard: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    backgroundColor: 'rgba(10, 22, 40, 0.9)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 160,
    zIndex: 10,
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
    color: Colors.textSubtleOnDark,
    textTransform: 'uppercase',
  },
  legendTitle: {
    ...Typography.cardTitle,
    color: Colors.textOnDark,
    marginBottom: 2,
  },
  legendSubtitle: {
    ...Typography.chip,
    color: Colors.textSubtleOnDark,
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
    color: Colors.textOnDark,
  },
});

export default MapScreen;
