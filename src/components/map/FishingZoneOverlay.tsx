/**
 * FishingZoneOverlay — Renders real INCOIS PFZ polygons, navigation vectors, and markers on map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polygon, Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import type { FishingZone } from '../../data/mockZones';

interface FishingZoneOverlayProps {
  zones: FishingZone[];
  selectedZoneId?: string | null;
  onZonePress?: (zone: FishingZone) => void;
}

export function renderFishingZoneElements(
  zones: FishingZone[],
  selectedZoneId?: string | null,
  onZonePress?: (zone: FishingZone) => void
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  // 1. Navigation Vectors (Polylines)
  zones.forEach((zone) => {
    if (!zone.navigationVector) return;
    const isSelected = zone.id === selectedZoneId;
    const nav = zone.navigationVector;

    elements.push(
      <Polyline
        key={`vector-${zone.id}`}
        coordinates={[nav.originPortCoordinates, zone.center]}
        strokeColor={isSelected ? Colors.oceanBlue : 'rgba(2, 132, 199, 0.45)'}
        strokeWidth={isSelected ? 3 : 1.5}
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
          <View style={styles.portMarker}>
            <Icon name="anchor" size={13} color="#FFFFFF" />
            <Text style={styles.portMarkerText}>{nav.originPortName}</Text>
          </View>
        </Marker>
      );
    }
  });

  // 2. PFZ Contour Polygons
  zones.forEach((zone) => {
    const isSelected = zone.id === selectedZoneId;
    elements.push(
      <Polygon
        key={`poly-${zone.id}`}
        coordinates={zone.coordinates}
        fillColor={isSelected ? 'rgba(15, 166, 136, 0.35)' : 'rgba(15, 166, 136, 0.20)'}
        strokeColor={isSelected ? '#059669' : Colors.primaryAccent}
        strokeWidth={isSelected ? 3 : 1.8}
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
  onZonePress,
}) => {
  return <>{renderFishingZoneElements(zones, selectedZoneId, onZonePress)}</>;
};

const styles = StyleSheet.create({
  portMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2540',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  portMarkerText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
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
