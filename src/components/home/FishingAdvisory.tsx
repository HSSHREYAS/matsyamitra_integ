/**
 * FishingAdvisory — Today's fishing advisory section with color-coded cards
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import Badge from '../common/Badge';
import type { Advisory } from '../../data/mockAdvisory';

interface FishingAdvisoryProps {
  advisories: Advisory[];
  onViewMap?: () => void;
}

const severityColors = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const FishingAdvisory: React.FC<FishingAdvisoryProps> = ({
  advisories,
  onViewMap,
}) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Today's Fishing Advisory</Text>
        <TouchableOpacity onPress={onViewMap} activeOpacity={0.7}>
          <Text style={styles.viewMapLink}>VIEW MAP →</Text>
        </TouchableOpacity>
      </View>

      {/* Advisory Cards */}
      {advisories.map((advisory) => (
        <View
          key={advisory.id}
          style={[
            styles.card,
            {
              borderLeftColor: severityColors[advisory.severity],
            },
          ]}>
          <Badge
            label={advisory.badgeLabel}
            variant={advisory.severity}
            style={styles.badge}
          />
          <Text style={styles.description}>{advisory.description}</Text>
          <View style={styles.subLabelRow}>
            {advisory.subIcon && (
              <Icon
                name={advisory.subIcon}
                size={14}
                color={severityColors[advisory.severity]}
              />
            )}
            <Text
              style={[
                styles.subLabel,
                { color: severityColors[advisory.severity] },
              ]}>
              {advisory.subLabel}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    color: Colors.textOnDark,
  },
  viewMapLink: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    ...Shadows.card,
  },
  badge: {
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subLabel: {
    ...Typography.chip,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default FishingAdvisory;
