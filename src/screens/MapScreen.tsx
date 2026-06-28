/**
 * MapScreen — Marine Navigation with Fishing/Risk zone toggle
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
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
  mockFishingZones,
  mockRiskZones,
  mapInitialRegion,
} from '../data/mockZones';
import type { FishingZone, RiskZone } from '../data/mockZones';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ZOOM_STEP = 0.5;
const MIN_DELTA = 0.02;
const MAX_LATITUDE_DELTA = 30;
const MAX_LONGITUDE_DELTA = 30;

const MapScreen: React.FC = () => {
  const [activeMode, setActiveMode] = useState(0); // 0 = Fishing, 1 = Risk
  const [selectedFishingZone, setSelectedFishingZone] = useState<FishingZone | null>(
    mockFishingZones[0]
  );
  const [selectedRiskZone, setSelectedRiskZone] = useState<RiskZone | null>(null);
  const [region, setRegion] = useState<Region>(mapInitialRegion);
  const mapRef = useRef<MapView>(null);

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
        <Text style={styles.topBarTitle}>Marine Navigation</Text>
        <Icon name="layers-outline" size={24} color={Colors.primaryAccent} />
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
              zones={mockFishingZones}
              onZonePress={handleFishingZonePress}
            />
          )}
          {activeMode === 1 && (
            <RiskZoneOverlay
              zones={mockRiskZones}
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
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
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
