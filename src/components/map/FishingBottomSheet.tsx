/**
 * FishingBottomSheet — Draggable bottom sheet for fishing zone details,
 * realistic nautical navigation legs, diesel fuel estimation, and fleet crowding intelligence.
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import Badge from '../common/Badge';
import type { FishingZone } from '../../data/mockZones';
import { mapCoverage } from '../../data/mockZones';
import { getCompassHeading } from '../../services/api/transformers';
import type { RealisticSeaRoute } from '../../services/navigation/nauticalRoutingEngine';

interface FishingBottomSheetProps {
  selectedZone?: FishingZone | null;
  activeRoute?: RealisticSeaRoute | null;
  departurePortName?: string;
  crowdInfo?: {
    count: number;
    level: 'low' | 'moderate' | 'high';
    labelKn: string;
  } | null;
  sheetSnapIndex?: number;
}

const FishingBottomSheet: React.FC<FishingBottomSheetProps> = ({
  selectedZone,
  activeRoute,
  departurePortName,
  crowdInfo,
  sheetSnapIndex,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['26%', '62%', '92%'], []);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [showAllLegs, setShowAllLegs] = useState(true); // Default open to show navigation legs!

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  useEffect(() => {
    if (typeof sheetSnapIndex === 'number' && sheetSnapIndex >= 0) {
      bottomSheetRef.current?.snapToIndex(sheetSnapIndex);
    }
  }, [sheetSnapIndex]);

  const toggleExpand = useCallback(() => {
    if (sheetIndex === 0) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [sheetIndex]);

  const crowdDotColor =
    crowdInfo?.level === 'low'
      ? '#10B981'
      : crowdInfo?.level === 'moderate'
      ? '#F59E0B'
      : '#EF4444';

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBackground}
      style={styles.sheet}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Collapsed content — tap to expand / collapse */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggleExpand}
          style={styles.collapsedContent}>
          <View style={styles.coverageTitleRow}>
            <Text style={styles.coverageTitle}>Active Coverage Area</Text>
            <Icon
              name={sheetIndex > 0 ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={Colors.primaryAccent}
            />
          </View>
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
        </TouchableOpacity>

        {/* Expanded content — Zone details */}
        {selectedZone && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <Badge label="OPTIMAL PFZ ZONE" variant="teal" style={styles.zoneBadge} />

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

            {/* Oceanographic Data cards */}
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

            {/* REALISTIC NAUTICAL SEA ROUTE CARD */}
            {activeRoute ? (
              <View style={styles.navCard}>
                <View style={styles.navHeader}>
                  <View style={styles.navHeaderLeft}>
                    <Icon name="compass-rose" size={20} color={Colors.oceanBlue} />
                    <View>
                      <Text style={styles.navHeaderTitle}>REALISTIC NAUTICAL SEA ROUTE</Text>
                      <Text style={styles.navHeaderSubtitle}>ನೈಜ ಸಮುದ್ರ ಸಂಚಾರ ಮಾರ್ಗ</Text>
                    </View>
                  </View>
                  <View style={styles.portPill}>
                    <Icon name="anchor" size={12} color={Colors.textPrimary} />
                    <Text style={styles.portPillText}>
                      {activeRoute.originPortName}
                    </Text>
                  </View>
                </View>

                {/* Primary Route Telemetry Grid */}
                <View style={styles.navGrid}>
                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>TOTAL DISTANCE</Text>
                    <Text style={styles.navMetricVal}>
                      {activeRoute.totalDistanceNm.toFixed(1)} NM
                    </Text>
                    <Text style={styles.navMetricSub}>
                      ({activeRoute.totalDistanceKm.toFixed(0)} km)
                    </Text>
                  </View>

                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>EST. TRANSIT</Text>
                    <Text style={styles.navMetricVal}>
                      ~{activeRoute.totalDurationHours} hrs
                    </Text>
                    <Text style={styles.navMetricSub}>@ 10.5 knots</Text>
                  </View>

                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>EST. DIESEL</Text>
                    <Text style={[styles.navMetricVal, { color: '#B45309' }]}>
                      ~{activeRoute.estimatedDieselLiters} L
                    </Text>
                    <Text style={styles.navMetricSub}>
                      ₹{activeRoute.estimatedFuelCostInr.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>FLEET CROWD</Text>
                    <View style={styles.crowdMetricRow}>
                      <View style={[styles.crowdDot, { backgroundColor: crowdDotColor }]} />
                      <Text style={styles.navMetricVal}>
                        {crowdInfo ? `${crowdInfo.count} bts` : 'Low'}
                      </Text>
                    </View>
                    <Text style={styles.navMetricSub}>
                      {crowdInfo?.level === 'low' ? 'Peaceful' : 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Fleet Crowding Advisory */}
                {crowdInfo && (
                  <View style={styles.crowdAdvisoryBox}>
                    <Icon
                      name={crowdInfo.level === 'low' ? 'check-decagram' : 'alert-circle'}
                      size={15}
                      color={crowdDotColor}
                    />
                    <Text style={styles.crowdAdvisoryText}>
                      {crowdInfo.labelKn} — {crowdInfo.level === 'low' ? 'Zero gear collision risk' : 'Maintain safe buffer distance'}
                    </Text>
                  </View>
                )}

                {/* Turn-by-Turn Nautical Legs Accordion */}
                <View style={styles.legsContainer}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowAllLegs(!showAllLegs)}
                    style={styles.legsToggleBtn}>
                    <Text style={styles.legsToggleTitle}>
                      NAUTICAL WAYPOINTS & TURNS ({activeRoute.legs.length} LEGS)
                    </Text>
                    <Icon
                      name={showAllLegs ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.oceanBlue}
                    />
                  </TouchableOpacity>

                  {showAllLegs && (
                    <View style={styles.legsList}>
                      {activeRoute.legs.map((leg) => (
                        <View key={leg.legIndex} style={styles.legCard}>
                          <View style={styles.legHeaderRow}>
                            <View style={styles.legBadge}>
                              <Text style={styles.legBadgeText}>LEG {leg.legIndex}</Text>
                            </View>
                            <Text style={styles.legTitle}>{leg.title}</Text>
                            <View style={styles.legHeadingPill}>
                              <Icon name="compass" size={12} color={Colors.oceanBlue} />
                              <Text style={styles.legHeadingText}>
                                {leg.bearingDegrees}° {leg.compassHeading}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.legInstructionKn}>{leg.instructionKn}</Text>
                          <Text style={styles.legInstructionEn}>{leg.instruction}</Text>

                          <View style={styles.legMetricsRow}>
                            <Text style={styles.legSubMetric}>
                              Distance: <Text style={styles.bold}>{leg.distanceNm} NM</Text> ({leg.distanceKm} km)
                            </Text>
                            <Text style={styles.legSubMetric}>
                              Est. Run: <Text style={styles.bold}>~{leg.estMinutes} mins</Text>
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : selectedZone.navigationVector ? (
              // Fallback INCOIS direct vector
              <View style={styles.navCard}>
                <View style={styles.navHeader}>
                  <View style={styles.navHeaderLeft}>
                    <Icon name="compass" size={18} color={Colors.oceanBlue} />
                    <Text style={styles.navHeaderTitle}>INCOIS NAVIGATION HEADING</Text>
                  </View>
                  <View style={styles.portPill}>
                    <Icon name="anchor" size={12} color={Colors.textPrimary} />
                    <Text style={styles.portPillText}>{selectedZone.navigationVector.originPortName}</Text>
                  </View>
                </View>

                <View style={styles.navGrid}>
                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>BEARING</Text>
                    <Text style={styles.navMetricVal}>
                      {selectedZone.navigationVector.bearingDegrees.toFixed(0)}° {getCompassHeading(selectedZone.navigationVector.bearingDegrees)}
                    </Text>
                  </View>
                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>DISTANCE</Text>
                    <Text style={styles.navMetricVal}>
                      {selectedZone.navigationVector.distanceKm.toFixed(1)} km
                    </Text>
                    <Text style={styles.navMetricSub}>
                      ({(selectedZone.navigationVector.distanceKm / 1.852).toFixed(1)} NM)
                    </Text>
                  </View>
                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>SEA DEPTH</Text>
                    <Text style={styles.navMetricVal}>
                      {selectedZone.navigationVector.depthM.toFixed(0)} m
                    </Text>
                    <Text style={styles.navMetricSub}>Bathymetric</Text>
                  </View>
                  <View style={styles.navMetric}>
                    <Text style={styles.navMetricLabel}>EST. TRANSIT</Text>
                    <Text style={styles.navMetricVal}>
                      ~{(selectedZone.navigationVector.distanceKm / 20).toFixed(1)} hrs
                    </Text>
                    <Text style={styles.navMetricSub}>@ 11 knots</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Target Species */}
            {selectedZone.species && selectedZone.species.length > 0 && (
              <View style={styles.speciesContainer}>
                <Text style={styles.speciesTitle}>TARGET SPECIES IN ZONE (ಮೀನು ಪ್ರಭೇದಗಳು)</Text>
                <View style={styles.speciesChips}>
                  {selectedZone.species.map((sp, idx) => (
                    <View key={idx} style={styles.speciesChip}>
                      <Icon name="fish" size={13} color={Colors.primaryAccentDark} />
                      <Text style={styles.speciesChipText}>{sp}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fishing Intelligence */}
            <View style={styles.intelligenceCard}>
              <View style={styles.intelligenceHeader}>
                <Icon name="brain" size={18} color={Colors.primaryAccent} />
                <Text style={styles.intelligenceTitle}>
                  FISHING INTELLIGENCE (ಮೀನುಗಾರಿಕೆ ಮಾಹಿತಿ)
                </Text>
              </View>
              <Text style={styles.intelligenceText}>
                {selectedZone.fishingIntelligence}
              </Text>
            </View>
          </View>
        )}
      </BottomSheetScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  collapsedContent: {
    paddingTop: Spacing.sm,
  },
  coverageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  coverageTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
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
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
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
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  navCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  navHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navHeaderTitle: {
    ...Typography.chip,
    color: Colors.oceanBlue,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navHeaderSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  portPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  portPillText: {
    ...Typography.micro,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  navGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: Spacing.xs,
  },
  navMetric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navMetricLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  navMetricVal: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
  },
  navMetricSub: {
    ...Typography.micro,
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  crowdMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  crowdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  crowdAdvisoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  crowdAdvisoryText: {
    fontSize: 10,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  legsContainer: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  legsToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  legsToggleTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.oceanBlue,
    letterSpacing: 0.4,
  },
  legsList: {
    padding: 8,
    gap: 8,
  },
  legCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oceanBlue,
  },
  legHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  legBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  legBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.oceanBlue,
  },
  legTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 6,
  },
  legHeadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  legHeadingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.oceanBlue,
  },
  legInstructionKn: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  legInstructionEn: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  legMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
  },
  legSubMetric: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  speciesContainer: {
    marginBottom: Spacing.lg,
  },
  speciesTitle: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  speciesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F2',
    borderWidth: 1,
    borderColor: '#D1E7E0',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  speciesChipText: {
    ...Typography.bodySmall,
    color: Colors.primaryAccentDark,
    fontWeight: '600',
  },
});

export default FishingBottomSheet;
