/**
 * RiskZoneOverlay — Renders risk zone circles and markers on map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Circle, Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import type { RiskZone } from '../../data/mockZones';

interface RiskZoneOverlayProps {
  zones: RiskZone[];
  onZonePress?: (zone: RiskZone) => void;
}

const riskColors = {
  critical: { fill: 'rgba(229, 57, 53, 0.25)', stroke: Colors.danger },
  moderate: { fill: 'rgba(245, 158, 11, 0.25)', stroke: Colors.caution },
  low: { fill: 'rgba(15, 166, 136, 0.15)', stroke: Colors.safe },
};

export function renderRiskZoneElements(
  zones: RiskZone[],
  onZonePress?: (zone: RiskZone) => void
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  zones.forEach((zone) => {
    const colors = riskColors[zone.riskLevel];
    elements.push(
      <Circle
        key={`circle-${zone.id}`}
        center={zone.center}
        radius={zone.radius}
        fillColor={colors.fill}
        strokeColor={colors.stroke}
        strokeWidth={2}
      />
    );
    elements.push(
      <Marker
        key={`risk-marker-${zone.id}`}
        coordinate={zone.center}
        onPress={() => onZonePress?.(zone)}
        title={zone.name}
        description={zone.description}
        tracksViewChanges={false}>
        <View style={[styles.markerContainer, { borderColor: colors.stroke }]}>
          <Icon
            name={
              zone.riskLevel === 'critical'
                ? 'alert'
                : zone.riskLevel === 'moderate'
                ? 'alert-outline'
                : 'check-circle'
            }
            size={16}
            color={colors.stroke}
          />
          <Text style={[styles.markerText, { color: colors.stroke }]}>
            {zone.waveHeight}m
          </Text>
        </View>
      </Marker>
    );
  });

  return elements;
}

const RiskZoneOverlay: React.FC<RiskZoneOverlayProps> = ({
  zones,
  onZonePress,
}) => {
  return <>{renderRiskZoneElements(zones, onZonePress)}</>;
};

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markerText: {
    ...Typography.chip,
    fontWeight: '700',
  },
});

export default RiskZoneOverlay;
