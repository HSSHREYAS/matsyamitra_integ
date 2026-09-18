/**
 * FishermanRouteView — Google Maps-style clean navigation interface for fishermen.
 * 
 * Features:
 * 1. Browse Mode:
 *    - Clean 3-tab selector (Best Match, Fuel Saver, High Catch).
 *    - Big, legible text and large touch targets designed for fishermen.
 *    - "VIEW SEA ROUTE (ಸಮುದ್ರ ಮಾರ್ಗ ನೋಡಿ)" action.
 * 
 * 2. Active Route Navigation Mode (like Google Maps):
 *    - All clutter disappears!
 *    - Top bar displays "Origin ➔ Destination" with an "Exit Route" button.
 *    - Bottom panel displays large ETA, NM distance, Diesel liters, and Turn-by-Turn legs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { RecommendedPfzZone } from '../../services/navigation/pfzRecommendationEngine';
import type { RealisticSeaRoute } from '../../services/navigation/nauticalRoutingEngine';

interface FishermanRouteViewProps {
  recommendedZones: RecommendedPfzZone[];
  selectedZone: RecommendedPfzZone | null;
  activeRoute: RealisticSeaRoute | null;
  isNavigating: boolean;
  onSelectZone: (rec: RecommendedPfzZone) => void;
  onStartNavigation: () => void;
  onExitNavigation: () => void;
  departurePortName: string;
}

export const FishermanRouteView: React.FC<FishermanRouteViewProps> = ({
  recommendedZones,
  selectedZone,
  activeRoute,
  isNavigating,
  onSelectZone,
  onStartNavigation,
  onExitNavigation,
  departurePortName,
}) => {
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);

  // =========================================================================
  // ACTIVE NAVIGATION MODE (GOOGLE MAPS STYLE)
  // =========================================================================
  if (isNavigating && activeRoute && selectedZone) {
    return (
      <>
        {/* Top Google Maps Style Navigation Bar */}
        <View style={styles.navTopBar}>
          <View style={styles.navTopRouteInfo}>
            <View style={styles.navOriginRow}>
              <View style={styles.greenDot} />
              <Text style={styles.navPortText} numberOfLines={1}>
                {departurePortName} Port
              </Text>
            </View>
            <Icon name="arrow-right-thin" size={20} color={Colors.textSecondary} />
            <View style={styles.navDestRow}>
              <View style={styles.redDot} />
              <Text style={styles.navDestText} numberOfLines={1}>
                {selectedZone.zone.name}
              </Text>
            </View>
          </View>

          {/* Exit Route Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onExitNavigation}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={styles.exitRouteButton}>
            <Icon name="close" size={18} color="#DC2626" />
            <Text style={styles.exitRouteText}>Exit</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Google Maps Navigation Panel */}
        <View style={styles.navBottomPanel}>
          {/* Quick Metrics Bar */}
          <View style={styles.navMetricsHeader}>
            <View style={styles.navPrimaryStat}>
              <Text style={styles.statBig}>{activeRoute.totalDistanceNm.toFixed(1)}</Text>
              <Text style={styles.statUnit}>NM</Text>
              <Text style={styles.statSub}>({activeRoute.totalDistanceKm.toFixed(0)} km)</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.navPrimaryStat}>
              <Text style={styles.statBig}>~{activeRoute.totalDurationHours}</Text>
              <Text style={styles.statUnit}>HRS</Text>
              <Text style={styles.statSub}>@ 10.5 kn</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.navPrimaryStat}>
              <Text style={[styles.statBig, { color: '#B45309' }]}>
                ~{activeRoute.estimatedDieselLiters}
              </Text>
              <Text style={[styles.statUnit, { color: '#B45309' }]}>L</Text>
              <Text style={styles.statSub}>₹{activeRoute.estimatedFuelCostInr.toLocaleString()}</Text>
            </View>
          </View>

          {/* Target Summary Row */}
          <View style={styles.navTargetRow}>
            <View style={styles.targetIconBox}>
              <Icon name="fish" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetTitle}>
                {selectedZone.zone.name} • {selectedZone.zone.potential}% Potential
              </Text>
              <Text style={styles.targetSubtitle}>
                {selectedZone.crowdLabelKn} • {activeRoute.legs.length} Navigation Legs
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowTurnByTurn(!showTurnByTurn)}
              style={styles.stepsToggleBtn}>
              <Text style={styles.stepsToggleText}>Steps</Text>
              <Icon
                name={showTurnByTurn ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.oceanBlue}
              />
            </TouchableOpacity>
          </View>

          {/* Turn by Turn Legs List (Expandable) */}
          {showTurnByTurn && (
            <ScrollView style={styles.legsScroll} nestedScrollEnabled>
              {activeRoute.legs.map((leg) => (
                <View key={leg.legIndex} style={styles.legStepCard}>
                  <View style={styles.legStepHeader}>
                    <View style={styles.legNumberBadge}>
                      <Text style={styles.legNumberText}>{leg.legIndex}</Text>
                    </View>
                    <Text style={styles.legStepTitle}>{leg.titleKn}</Text>
                    <View style={styles.legCompassPill}>
                      <Icon name="compass" size={12} color={Colors.oceanBlue} />
                      <Text style={styles.legCompassText}>
                        {leg.bearingDegrees}° {leg.compassHeading}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.legInstructionKn}>{leg.instructionKn}</Text>
                  <Text style={styles.legSubText}>
                    {leg.distanceNm} NM • ~{leg.estMinutes} mins
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Start Sailing Big Action Button */}
          <View style={styles.navActionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.startSailingBtn}>
              <Icon name="compass-outline" size={22} color="#FFFFFF" />
              <Text style={styles.startSailingBtnText}>START SEA NAVIGATION (ಯಾನ ಆರಂಭ)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  // =========================================================================
  // BROWSE MODE (CLEAN & FISHERMAN FRIENDLY)
  // =========================================================================
  if (!recommendedZones || recommendedZones.length === 0) {
    return null;
  }

  const currentZone = selectedZone || recommendedZones[0];

  return (
    <View style={styles.browseContainer}>
      {/* 3 Large, Fisherman-Friendly Option Tabs */}
      <View style={styles.tabsRow}>
        {recommendedZones.map((rec) => {
          const isSelected = rec.zone.id === currentZone.zone.id;
          const tabLabel =
            rec.rank === 1
              ? '① Best Match'
              : rec.rank === 2
              ? '② Fuel Saver'
              : '③ High Catch';
          const badgeColor =
            rec.rank === 1
              ? '#D97706'
              : rec.rank === 2
              ? '#059669'
              : '#0284C7';

          return (
            <TouchableOpacity
              key={rec.zone.id}
              activeOpacity={0.8}
              onPress={() => onSelectZone(rec)}
              style={[
                styles.tabBtn,
                isSelected && [styles.tabBtnSelected, { borderColor: badgeColor }],
              ]}>
              <Text
                style={[
                  styles.tabBtnText,
                  isSelected && { color: badgeColor, fontWeight: '800' },
                ]}>
                {tabLabel}
              </Text>
              <Text style={styles.tabSubText}>
                {rec.distanceNm.toFixed(0)} NM • {rec.zone.potential}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Zone Highlight Card */}
      <View style={styles.zoneSummaryCard}>
        <View style={styles.zoneHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.zoneNameText} numberOfLines={1}>
              {currentZone.zone.name}
            </Text>
            <Text style={styles.zoneSubKannada}>
              {currentZone.badgeLabelKn} • {currentZone.crowdLabelKn}
            </Text>
          </View>

          <View style={styles.potentialBadge}>
            <Icon name="fish" size={14} color="#059669" />
            <Text style={styles.potentialBadgeText}>{currentZone.zone.potential}% Catch</Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Icon name="map-marker-distance" size={16} color={Colors.oceanBlue} />
            <Text style={styles.metricValText}>{currentZone.distanceNm.toFixed(1)} NM</Text>
            <Text style={styles.metricLabelText}>Distance</Text>
          </View>

          <View style={styles.metricBox}>
            <Icon name="gas-station" size={16} color="#D97706" />
            <Text style={styles.metricValText}>~{currentZone.realisticRoute.estimatedDieselLiters} L</Text>
            <Text style={styles.metricLabelText}>Diesel Est.</Text>
          </View>

          <View style={styles.metricBox}>
            <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.metricValText}>~{currentZone.realisticRoute.totalDurationHours} hrs</Text>
            <Text style={styles.metricLabelText}>Run Time</Text>
          </View>
        </View>

        {/* Primary View Sea Route Button (Large touch target) */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onStartNavigation}
          style={styles.viewRouteBtn}>
          <Icon name="navigation-variant" size={20} color="#FFFFFF" />
          <Text style={styles.viewRouteBtnText}>VIEW SEA ROUTE (ಸಮುದ್ರ ಮಾರ್ಗ ನೋಡಿ)</Text>
          <Icon name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ==================== BROWSE MODE STYLES ====================
  browseContainer: {
    position: 'absolute',
    bottom: 12,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.card,
    elevation: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tabBtnSelected: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabSubText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  zoneSummaryCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  zoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  zoneNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  zoneSubKannada: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  potentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  potentialBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricBox: {
    alignItems: 'center',
    gap: 2,
  },
  metricValText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  viewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.oceanBlue,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    elevation: 4,
    shadowColor: Colors.oceanBlue,
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  viewRouteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ==================== NAVIGATION MODE STYLES ====================
  navTopBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 16 : 52,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.card,
    elevation: 10,
  },
  navTopRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  navOriginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  navPortText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  navDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  navDestText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  exitRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginLeft: 8,
  },
  exitRouteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },

  navBottomPanel: {
    position: 'absolute',
    bottom: 12,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    ...Shadows.card,
    elevation: 14,
  },
  navMetricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  navPrimaryStat: {
    alignItems: 'center',
  },
  statBig: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.oceanBlue,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#BAE6FD',
  },
  navTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  targetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  targetSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E0F2FE',
  },
  stepsToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.oceanBlue,
  },
  legsScroll: {
    maxHeight: 180,
    marginBottom: Spacing.sm,
  },
  legStepCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oceanBlue,
  },
  legStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  legNumberBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  legNumberText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.oceanBlue,
  },
  legStepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 6,
  },
  legCompassPill: {
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
  legCompassText: {
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
  legSubText: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  navActionRow: {
    marginTop: 4,
  },
  startSailingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669', // Safe navigation green
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    elevation: 4,
  },
  startSailingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default FishermanRouteView;
