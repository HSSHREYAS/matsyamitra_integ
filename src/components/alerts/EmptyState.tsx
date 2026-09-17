/**
 * EmptyState — Displayed when there are no alerts
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useLanguage } from '../../i18n';

interface EmptyStateProps {
  onRefresh?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onRefresh }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* System Active badge */}
      <View style={styles.activeBadge}>
        <View style={styles.activeIndicator} />
        <Text style={styles.activeText}>SYSTEM ACTIVE</Text>
      </View>

      {/* Ocean illustration placeholder */}
      <View style={styles.illustrationContainer}>
        <View style={styles.illustration}>
          <View style={styles.skyGradient} />
          <View style={styles.seaGradient} />
          <Icon
            name="waves"
            size={40}
            color="rgba(15, 166, 136, 0.3)"
            style={styles.waveIcon}
          />
        </View>
      </View>

      {/* Text content */}
      <Text style={styles.title}>{t('alerts_empty_title')}</Text>
      <Text style={styles.subtitle}>
        {t('alerts_empty_subtitle')}
      </Text>

      {/* Refresh button */}
      <TouchableOpacity
        onPress={onRefresh}
        style={styles.refreshButton}
        activeOpacity={0.7}>
        <Icon name="refresh" size={24} color={Colors.primaryAccent} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onRefresh} activeOpacity={0.7}>
        <Text style={styles.checkText}>{t('alerts_empty_refresh_btn')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 60,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 166, 136, 0.1)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: Spacing.xxl,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryAccent,
  },
  activeText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  illustrationContainer: {
    width: 260,
    height: 160,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  illustration: {
    flex: 1,
    position: 'relative',
  },
  skyGradient: {
    flex: 1,
    backgroundColor: '#E0F0FF',
  },
  seaGradient: {
    flex: 1,
    backgroundColor: '#B3D8F0',
  },
  waveIcon: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    left: '45%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  refreshButton: {
    marginBottom: Spacing.md,
  },
  checkText: {
    ...Typography.label,
    color: Colors.primaryAccent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default EmptyState;
