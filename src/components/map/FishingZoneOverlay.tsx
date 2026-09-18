/**
 * FishingZoneOverlay — Renders real INCOIS PFZ polygons, realistic nautical multi-leg sea routes,
 * and marine chartplotter markers on MapView.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polygon, Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import type { FishingZone } from '../../data/mockZones';
import type { RealisticSeaRoute } from '../../services/navigation/nauticalRoutingEngine';

interface FishingZoneOverlayProps {
  zones: FishingZone[];
  selectedZoneId?: string | null;
  activeRealisticRoute?: RealisticSeaRoute | null;
  onZonePress?: (zone: FishingZone) => void;
}

export function renderFishingZoneElements(
  zones: FishingZone[],
  selectedZoneId?: string | null,
  onZonePress?: (zone: FishingZone) => void,
  activeRealisticRoute?: RealisticSeaRoute | null
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  // 1. Render Realistic Multi-Leg Sea Route for selected zone (if available)
  if (activeRealisticRoute && activeRealisticRoute.coordinates.length > 1) {
    // Outer Glow Nautical Polyline
    elements.push(
      <Polyline
        key="realistic-route-glow"
        coordinates={activeRealisticRoute.coordinates}
        strokeColor="rgba(2, 132, 199, 0.35)"
        strokeWidth={7}
        zIndex={5}
      />
    );

    // Main Nautical Track Polyline
    elements.push(
      <Polyline
        key="realistic-route-core"
        coordinates={activeRealisticRoute.coordinates}
        strokeColor={Colors.oceanBlue}
        strokeWidth={3.5}
        lineDashPattern={[12, 4]}
        zIndex={6}
      />
    );

    // Waypoint Markers along the realistic sea route
    activeRealisticRoute.waypoints.forEach((wp, idx) => {
      const isOrigin = wp.type === 'origin';
      const isFairway = wp.type === 'breakwater';
      const isShelf = wp.type === 'shelf';

      // Skip destination marker since PFZ Center Marker will handle it
      if (wp.type === 'destination') return;

      elements.push(
        <Marker
          key={`wp-${idx}-${wp.name}`}
          coordinate={wp.point}
          title={wp.name}
          description={
            isOrigin
              ? `Departure: ${activeRealisticRoute.originPortName}`
              : isFairway
              ? 'Breakwater Fairway Sea Buoy'
              : '15m Bathymetric Shelf Clearance'
          }
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={9}>
          <View
            style={[
              styles.waypointMarker,
              isOrigin
                ? styles.originMarker
                : isFairway
                ? styles.fairwayMarker
                : styles.shelfMarker,
            ]}>
            <Icon
              name={wp.icon}
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.waypointText}>
              {isOrigin
                ? wp.name
                : isFairway
                ? 'Sea Buoy'
                : 'Shelf Turn'}
            </Text>
          </View>
        </Marker>
      );
    });
  } else {
    // Fallback: reference straight lines for unselected zones
    zones.forEach((zone) => {
      if (!zone.navigationVector) return;
      const isSelected = zone.id === selectedZoneId;
      const nav = zone.navigationVector;

      elements.push(
        <Polyline
          key={`vector-${zone.id}`}
          coordinates={[nav.originPortCoordinates, zone.center]}
          strokeColor={isSelected ? Colors.oceanBlue : 'rgba(2, 132, 199, 0.25)'}
          strokeWidth={isSelected ? 3 : 1.2}
          lineDashPattern={isSelected ? [6, 4] : [8, 6]}
          zIndex={isSelected ? 5 : 2}
        />
      );

      if (isSelected) {
        elements.push(
          <Marker
            key={`port-${zone.id}`}
            coordinate={nav.originPortCoordinates}
            title={nav.originPortName}
            description="Departure Landing Center"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={8}>
            <View style={styles.originMarker}>
              <Icon name="anchor" size={13} color="#FFFFFF" />
              <Text style={styles.waypointText}>{nav.originPortName}</Text>
            </View>
          </Marker>
        );
      }
    });
  }

  // 2. PFZ Contour Polygons (Continental Shelf Thermal Fronts)
  zones.forEach((zone) => {
    const isSelected = zone.id === selectedZoneId;
    elements.push(
      <Polygon
        key={`poly-${zone.id}`}
        coordinates={zone.coordinates}
        fillColor={isSelected ? 'rgba(15, 166, 136, 0.38)' : 'rgba(15, 166, 136, 0.18)'}
        strokeColor={isSelected ? '#059669' : Colors.primaryAccent}
        strokeWidth={isSelected ? 3 : 1.5}
        tappable
        zIndex={isSelected ? 4 : 3}
        onPress={() => onZonePress?.(zone)}
      />
    );
  });

  // 3. PFZ Center Markers
  zones.forEach((zone) => {
    const isSelected = zone.id === selectedZoneId;
    const nav = zone.navigationVector;

    elements.push(
      <Marker
        key={`marker-${zone.id}`}
        coordinate={zone.center}
        title={zone.name}
        description={`${zone.potential}% Potential • ${nav ? `${nav.depthM}m Depth • ${nav.distanceKm.toFixed(0)}km` : zone.sectorCode}`}
        onPress={() => onZonePress?.(zone)}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={isSelected}
        zIndex={isSelected ? 10 : 6}>
        <View
          style={[
            styles.pfzMarker,
            isSelected && styles.pfzMarkerSelected,
          ]}>
          <Icon
            name="fish"
            size={14}
            color={isSelected ? '#FFFFFF' : Colors.primaryAccentDark}
          />
          <Text
            style={[
              styles.pfzMarkerText,
              isSelected && styles.pfzMarkerTextSelected,
            ]}>
            {zone.potential}%
          </Text>
          {nav && (
            <View
              style={[
                styles.depthBadge,
                isSelected && styles.depthBadgeSelected,
              ]}>
              <Text
                style={[
                  styles.depthBadgeText,
                  isSelected && styles.depthBadgeTextSelected,
                ]}>
                {nav.depthM}m
              </Text>
            </View>
          )}
        </View>
      </Marker>
    );
  });

  return elements;
}

const FishingZoneOverlay: React.FC<FishingZoneOverlayProps> = ({
  zones,
  selectedZoneId,
  activeRealisticRoute,
  onZonePress,
}) => {
  return <>{renderFishingZoneElements(zones, selectedZoneId, onZonePress, activeRealisticRoute)}</>;
};

const styles = StyleSheet.create({
  waypointMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  originMarker: {
    backgroundColor: '#0A2540', // Deep Navy
  },
  fairwayMarker: {
    backgroundColor: '#0284C7', // Maritime Ocean Blue
  },
  shelfMarker: {
    backgroundColor: '#0D9488', // Teal Bathymetric
  },
  waypointText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  pfzMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: Colors.primaryAccent,
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  pfzMarkerSelected: {
    backgroundColor: Colors.primaryAccent,
    borderColor: '#059669',
    elevation: 6,
  },
  pfzMarkerText: {
    ...Typography.chip,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  pfzMarkerTextSelected: {
    color: '#FFFFFF',
  },
  depthBadge: {
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  depthBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  depthBadgeText: {
    ...Typography.micro,
    color: Colors.primaryAccentDark,
    fontWeight: '700',
  },
  depthBadgeTextSelected: {
    color: '#FFFFFF',
  },
});

export default FishingZoneOverlay;
