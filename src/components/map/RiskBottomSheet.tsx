/**
 * RiskBottomSheet — Bottom sheet for risk zone analytics
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { mapCoverage } from '../../data/mockZones';
import type { RiskZone } from '../../data/mockZones';

interface RiskBottomSheetProps {
  selectedZone?: RiskZone | null;
}

const RiskBottomSheet: React.FC<RiskBottomSheetProps> = ({ selectedZone }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['22%', '55%'], []);

  const handleSheetChanges = useCallback((index: number) => {}, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBackground}
      style={styles.sheet}>
      <BottomSheetView style={styles.content}>
        {/* Header with LIVE indicator */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Zone Analytics</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.riskSummary}>
          3 High Risk areas detected in your current trajectory
        </Text>

        {/* Zone summary */}
        <View style={styles.zoneSummaryRow}>
          <View style={styles.zoneCountRow}>
            <View style={[styles.dot, { backgroundColor: Colors.safe }]} />
            <Text style={styles.countText}>
              {mapCoverage.safeZones} Safe Zones
            </Text>
            <Text style={styles.dotSeparator}>·</Text>
            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.countText}>
              {mapCoverage.riskZones} Risk Zone
            </Text>
          </View>
          <Text style={styles.coordText}>
            Near your current coordinate ({mapCoverage.currentCoordinate})
          </Text>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricChip}>
            <Icon name="waves" size={16} color={Colors.info} />
            <View>
              <Text style={styles.metricLabel}>TIDE HEIGHT</Text>
              <Text style={styles.metricValue}>
                {mapCoverage.tideHeight}m {mapCoverage.tideStatus}
              </Text>
            </View>
          </View>
          <View style={styles.metricChip}>
            <Icon name="eye-off" size={16} color={Colors.caution} />
            <View>
              <Text style={styles.metricLabel}>VISIBILITY</Text>
              <Text style={styles.metricValue}>{mapCoverage.visibilityStatus}</Text>
            </View>
          </View>
        </View>

        {/* Risk Legend */}
        {selectedZone && (
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Risk Details: {selectedZone.name}</Text>
            <View style={styles.legendItem}>
              <Icon name="wave" size={16} color={Colors.danger} />
              <Text style={styles.legendText}>
                Wave Height: {selectedZone.waveHeight}m
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="weather-windy" size={16} color={Colors.caution} />
              <Text style={styles.legendText}>
                Wind Speed: {selectedZone.windSpeed} kt
              </Text>
            </View>
            <Text style={styles.descText}>{selectedZone.description}</Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheet: {
    zIndex: 20,
  },
  sheetBackground: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...Shadows.bottomSheet,
  },
  handle: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerBg,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  liveText: {
    ...Typography.chip,
    color: Colors.danger,
    fontWeight: '700',
  },
  riskSummary: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  zoneSummaryRow: {
    marginBottom: Spacing.md,
  },
  zoneCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  countText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: Colors.textSecondary,
  },
  coordText: {
    ...Typography.chip,
    color: Colors.textSubtleOnDark,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  metricLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  legendCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  legendTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  legendText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  descText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});

export default RiskBottomSheet;
