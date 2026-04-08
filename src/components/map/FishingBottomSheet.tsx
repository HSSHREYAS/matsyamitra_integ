/**
 * FishingBottomSheet — Draggable bottom sheet for fishing zone details
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import Badge from '../common/Badge';
import type { FishingZone } from '../../data/mockZones';
import { mapCoverage } from '../../data/mockZones';

interface FishingBottomSheetProps {
  selectedZone?: FishingZone | null;
}

const FishingBottomSheet: React.FC<FishingBottomSheetProps> = ({
  selectedZone,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '60%', '90%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    // Handle sheet position changes if needed
  }, []);

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
        {/* Collapsed content — always visible */}
        <View style={styles.collapsedContent}>
          <Text style={styles.coverageTitle}>Active Coverage Area</Text>
          <View style={styles.zoneCountRow}>
            <View style={[styles.dot, { backgroundColor: Colors.safe }]} />
            <Text style={styles.zoneCountText}>
              {mapCoverage.safeZones} Safe Zones
            </Text>
            <Text style={styles.dotSeparator}>·</Text>
            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.zoneCountText}>
              {mapCoverage.riskZones} Risk Zone near your area
            </Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <Icon name="eye" size={16} color={Colors.primaryAccent} />
              <View>
                <Text style={styles.metricLabel}>VISIBILITY</Text>
                <Text style={styles.metricValue}>
                  {mapCoverage.visibility}{mapCoverage.visibilityUnit}
                </Text>
              </View>
            </View>
            <View style={styles.metricChip}>
              <Icon name="thermometer" size={16} color={Colors.primaryAccent} />
              <View>
                <Text style={styles.metricLabel}>WATER TEMP</Text>
                <Text style={styles.metricValue}>
                  {mapCoverage.waterTemp}{mapCoverage.waterTempUnit}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expanded content — Zone details */}
        {selectedZone && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <Badge label="OPTIMAL ZONE" variant="teal" style={styles.zoneBadge} />

            <Text style={styles.sectorLabel}>CURRENT SECTOR</Text>
            <Text style={styles.zoneName}>{selectedZone.name}</Text>
            <View style={styles.sectorRow}>
              <Text style={styles.sectorCode}>
                {selectedZone.sectorCode} • {selectedZone.region}
              </Text>
              <View style={styles.potentialBadge}>
                <Text style={styles.potentialText}>
                  {selectedZone.potential}% Potential
                </Text>
              </View>
            </View>

            {/* Data cards */}
            <View style={styles.dataCardsRow}>
              <View style={styles.dataCard}>
                <Icon name="leaf" size={20} color={Colors.primaryAccent} />
                <Text style={styles.dataLabel}>CHLOROPHYLL</Text>
                <Text style={styles.dataValue}>
                  {selectedZone.chlorophyll} mg/m³
                </Text>
                <Badge
                  label={selectedZone.chlorophyllStatus.toUpperCase()}
                  variant="teal"
                  small
                />
              </View>
              <View style={styles.dataCard}>
                <Icon name="thermometer-lines" size={20} color="#F59E0B" />
                <Text style={styles.dataLabel}>SST</Text>
                <Text style={styles.dataValue}>{selectedZone.sst} °C</Text>
                <Badge
                  label={selectedZone.sstStatus}
                  variant="caution"
                  small
                />
              </View>
            </View>

            {/* Fishing Intelligence */}
            <View style={styles.intelligenceCard}>
              <View style={styles.intelligenceHeader}>
                <Icon name="brain" size={18} color={Colors.primaryAccent} />
                <Text style={styles.intelligenceTitle}>
                  FISHING INTELLIGENCE
                </Text>
              </View>
              <Text style={styles.intelligenceText}>
                {selectedZone.fishingIntelligence}
              </Text>
            </View>
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
  collapsedContent: {
    paddingTop: Spacing.sm,
  },
  coverageTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  zoneCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  zoneCountText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: Colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  },
  expandedContent: {
    paddingTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerLight,
    marginBottom: Spacing.lg,
  },
  zoneBadge: {
    marginBottom: Spacing.md,
  },
  sectorLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  zoneName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectorCode: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  potentialBadge: {
    backgroundColor: Colors.primaryAccentLight,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  potentialText: {
    ...Typography.label,
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  dataCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dataCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  dataLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dataValue: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  intelligenceCard: {
    backgroundColor: Colors.primaryBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  intelligenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  intelligenceTitle: {
    ...Typography.label,
    color: Colors.primaryAccent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  intelligenceText: {
    ...Typography.body,
    color: Colors.textSubtleOnDark,
    lineHeight: 22,
  },
});

export default FishingBottomSheet;
