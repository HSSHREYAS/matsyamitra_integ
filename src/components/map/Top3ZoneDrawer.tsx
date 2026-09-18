/**
 * Top3ZoneDrawer — Interactive carousel surfacing the Top 3 Recommended PFZ Zones
 * tailored to the fisher's active departure port.
 * 
 * Features:
 * - Multi-parameter ranking: Catch Potential + Fuel/Distance + Fleet Crowding
 * - Live diesel fuel estimates (~₹88/L subsidized rate)
 * - One-tap selection that centers camera & plots the multi-leg nautical route
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { RecommendedPfzZone } from '../../services/navigation/pfzRecommendationEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 300);

interface Top3ZoneDrawerProps {
  recommendedZones: RecommendedPfzZone[];
  selectedZoneId?: string | null;
  onSelectZone: (rec: RecommendedPfzZone) => void;
  departurePortName: string;
  onOpenPortPicker?: () => void;
}

export const Top3ZoneDrawer: React.FC<Top3ZoneDrawerProps> = ({
  recommendedZones,
  selectedZoneId,
  onSelectZone,
  departurePortName,
  onOpenPortPicker,
}) => {
  if (!recommendedZones || recommendedZones.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Icon name="star-shooting" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>TOP 3 RECOMMENDED ZONES</Text>
            <Text style={styles.headerSubtitle}>ಶಿಫಾರಸು ಮಾಡಿದ ವಲಯಗಳು • MCDS Algorithm</Text>
          </View>
        </View>

        {/* Departure Port Pill (tappable to switch port) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenPortPicker}
          style={styles.portPill}>
          <Icon name="anchor" size={13} color={Colors.oceanBlue} />
          <Text style={styles.portPillText} numberOfLines={1}>
            {departurePortName || 'Port'}
          </Text>
          <Icon name="chevron-down" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Cards Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + Spacing.sm}>
        {recommendedZones.map((rec) => {
          const isSelected = rec.zone.id === selectedZoneId;
          const route = rec.realisticRoute;

          const badgeBg =
            rec.rank === 1
              ? '#FEF3C7'
              : rec.rank === 2
              ? '#D1FAE5'
              : '#E0F2FE';
          const badgeTextColor =
            rec.rank === 1
              ? '#B45309'
              : rec.rank === 2
              ? '#047857'
              : '#0369A1';
          const badgeBorderColor =
            rec.rank === 1
              ? '#FDE68A'
              : rec.rank === 2
              ? '#A7F3D0'
              : '#BAE6FD';

          const crowdDotColor =
            rec.crowdLevel === 'low'
              ? '#10B981'
              : rec.crowdLevel === 'moderate'
              ? '#F59E0B'
              : '#EF4444';

          return (
            <TouchableOpacity
              key={rec.zone.id}
              activeOpacity={0.88}
              onPress={() => onSelectZone(rec)}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
              ]}>
              {/* Card Header: Rank Badge & Potential */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: badgeBg, borderColor: badgeBorderColor },
                  ]}>
                  <Text style={[styles.rankBadgeText, { color: badgeTextColor }]}>
                    {rec.badgeLabel}
                  </Text>
                </View>

                <View style={styles.potentialPill}>
                  <Icon name="fish" size={12} color={Colors.primaryAccent} />
                  <Text style={styles.potentialText}>{rec.zone.potential}%</Text>
                </View>
              </View>

              {/* Zone Name */}
              <Text style={styles.zoneName} numberOfLines={1}>
                {rec.zone.name}
              </Text>
              <Text style={styles.zoneKannada} numberOfLines={1}>
                {rec.badgeLabelKn}
              </Text>

              {/* Metrics Grid */}
              <View style={styles.metricsGrid}>
                {/* Distance */}
                <View style={styles.metricItem}>
                  <Icon name="map-marker-distance" size={14} color={Colors.oceanBlue} />
                  <View style={styles.metricTexts}>
                    <Text style={styles.metricVal}>
                      {rec.distanceNm.toFixed(1)} NM
                    </Text>
                    <Text style={styles.metricSub}>
                      ({rec.distanceKm.toFixed(0)} km)
                    </Text>
                  </View>
                </View>

                {/* Fuel Estimate */}
                <View style={styles.metricItem}>
                  <Icon name="gas-station" size={14} color="#D97706" />
                  <View style={styles.metricTexts}>
                    <Text style={styles.metricVal}>
                      ~{route.estimatedDieselLiters} L
                    </Text>
                    <Text style={styles.metricSub}>
                      ₹{route.estimatedFuelCostInr.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Status Row: Fleet Crowding & Route CTA */}
              <View style={styles.cardFooter}>
                <View style={styles.crowdIndicator}>
                  <View style={[styles.crowdDot, { backgroundColor: crowdDotColor }]} />
                  <Text style={styles.crowdText} numberOfLines={1}>
                    {rec.crowdLabelKn}
                  </Text>
                </View>

                <View
                  style={[
                    styles.ctaButton,
                    isSelected && styles.ctaButtonSelected,
                  ]}>
                  <Icon
                    name={isSelected ? 'check-circle' : 'navigation'}
                    size={12}
                    color={isSelected ? '#FFFFFF' : Colors.oceanBlue}
                  />
                  <Text
                    style={[
                      styles.ctaButtonText,
                      isSelected && styles.ctaButtonTextSelected,
                    ]}>
                    {isSelected ? 'ACTIVE ROUTE' : 'PLOT SEA ROUTE'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 37, 64, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    ...Shadows.card,
  },
  headerIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  portPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
    maxWidth: 140,
    ...Shadows.card,
  },
  portPillText: {
    ...Typography.micro,
    color: Colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.card,
  },
  cardSelected: {
    borderColor: Colors.oceanBlue,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: Colors.oceanBlue,
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  potentialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  potentialText: {
    ...Typography.micro,
    color: Colors.primaryAccentDark,
    fontWeight: '800',
  },
  zoneName: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  zoneKannada: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 12,
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricTexts: {
    flex: 1,
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metricSub: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crowdIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  crowdDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  crowdText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    flexShrink: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ctaButtonSelected: {
    backgroundColor: Colors.oceanBlue,
  },
  ctaButtonText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.oceanBlue,
    letterSpacing: 0.3,
  },
  ctaButtonTextSelected: {
    color: '#FFFFFF',
  },
});

export default Top3ZoneDrawer;
