/**
 * AlertCard — Individual alert/notice card with severity styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import Badge from '../common/Badge';
import type { AlertItem, AlertSeverity } from '../../data/mockAlerts';

interface AlertCardProps {
  alert: AlertItem;
  onPress?: () => void;
}

const severityConfig: Record<
  AlertSeverity,
  { iconBg: string; iconColor: string; borderColor: string }
> = {
  urgent: {
    iconBg: Colors.dangerBg,
    iconColor: Colors.danger,
    borderColor: Colors.danger,
  },
  caution: {
    iconBg: Colors.cautionBg,
    iconColor: Colors.caution,
    borderColor: Colors.caution,
  },
  info: {
    iconBg: Colors.infoBg,
    iconColor: Colors.info,
    borderColor: Colors.info,
  },
  seasonal: {
    iconBg: Colors.secondaryBackground,
    iconColor: Colors.primaryAccent,
    borderColor: Colors.primaryAccent,
  },
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, onPress }) => {
  const config = severityConfig[alert.severity];

  // Seasonal cards have a special dark design
  if (alert.severity === 'seasonal') {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <LinearGradient
          colors={['#0D2844', '#142D4C']}
          style={styles.seasonalCard}>
          <Text style={styles.seasonalLabel}>{alert.badgeLabel}</Text>
          <Text style={styles.seasonalTitle}>{alert.title}</Text>
          <Text style={styles.seasonalBody}>{alert.body}</Text>
          <TouchableOpacity style={styles.directiveButton} activeOpacity={0.7}>
            <Text style={styles.directiveText}>Read Full Directive →</Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {/* Left icon */}
        <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
          <Icon name={alert.icon} size={20} color={config.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          {/* Top row: badge + timestamp */}
          <View style={styles.topRow}>
            <Badge label={alert.badgeLabel} variant={alert.severity} small />
            <Text style={styles.timestamp}>{alert.timestamp}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {alert.title}
          </Text>

          {/* Body */}
          <Text style={styles.body} numberOfLines={3}>
            {alert.body}
          </Text>

          {/* Source */}
          <View style={styles.sourceRow}>
            <Icon name="shield-check" size={14} color={Colors.textSecondary} />
            <Text style={styles.sourceText}>{alert.source}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timestamp: {
    ...Typography.chip,
    color: Colors.textSecondary,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
  },
  body: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    ...Typography.chip,
    color: Colors.textSecondary,
  },
  // Seasonal card styles
  seasonalCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.cardHeavy,
  },
  seasonalLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  seasonalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textOnDark,
    marginBottom: Spacing.sm,
  },
  seasonalBody: {
    ...Typography.body,
    color: Colors.textSubtleOnDark,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  directiveButton: {
    borderWidth: 1,
    borderColor: Colors.primaryAccent,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    alignSelf: 'flex-start',
  },
  directiveText: {
    ...Typography.label,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
});

export default AlertCard;
