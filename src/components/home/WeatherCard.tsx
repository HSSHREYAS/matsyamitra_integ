/**
 * WeatherCard — Crisp white card with current conditions, temperature, metrics, and ocean telemetry
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { WeatherData } from '../../data/mockWeather';
import { useLanguage } from '../../i18n';

interface WeatherCardProps {
  weather: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  const { t } = useLanguage();

  const safetyBadge = useMemo(() => {
    const c = (weather.condition || '').toUpperCase();
    if (c.includes('ROUGH') || c.includes('DANGER')) {
      return {
        label: t('unsafe_to_fish'),
        bg: Colors.dangerBg,
        text: Colors.dangerText,
      };
    }
    if (c.includes('MODERATE') || c.includes('WIND') || c.includes('CAUTION')) {
      return {
        label: t('caution_to_fish'),
        bg: Colors.cautionBg,
        text: Colors.cautionText,
      };
    }
    return {
      label: t('safe_to_fish'),
      bg: Colors.safeBg,
      text: Colors.safeText,
    };
  }, [weather.condition, t]);

  const windUnit = weather.windUnit === 'km/h' ? t('km_per_hour') : weather.windUnit;
  const waveUnit = weather.waveUnit === 'm' ? ` ${t('meters')}` : weather.waveUnit;

  return (
    <View style={styles.card}>
      {/* Top Header: Current Conditions + Safety Pill */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('current_conditions')}</Text>
        <View style={[styles.safetyBadge, { backgroundColor: safetyBadge.bg }]}>
          <Text style={[styles.safetyBadgeText, { color: safetyBadge.text }]}>
            {safetyBadge.label}
          </Text>
        </View>
      </View>

      {/* Temperature & Weather Icon */}
      <View style={styles.tempRow}>
        <Icon
          name="weather-sunny"
          size={36}
          color={Colors.sunYellow}
          style={styles.weatherIcon}
        />
        <Text style={styles.temperature}>{weather.temperature}°C</Text>
      </View>

      {/* 3-Column Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Icon name="weather-windy" size={13} color={Colors.oceanBlue} />
            <Text style={styles.metricLabel}>{t('wind_speed')}</Text>
          </View>
          <Text style={styles.metricValue}>
            {weather.windSpeed} {windUnit}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Icon name="wave" size={13} color={Colors.oceanBlue} />
            <Text style={styles.metricLabel}>{t('wave_height')}</Text>
          </View>
          <Text style={styles.metricValue}>
            {weather.waveHeight}{waveUnit}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Icon name="water-percent" size={13} color={Colors.oceanBlue} />
            <Text style={styles.metricLabel}>{t('humidity')}</Text>
          </View>
          <Text style={styles.metricValue}>{weather.humidity}%</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Ocean Data Row (Sea Temp & Chlorophyll) */}
      <View style={styles.oceanRow}>
        <View style={styles.oceanChip}>
          <View style={styles.oceanChipHeader}>
            <Icon name="thermometer" size={13} color={Colors.primaryAccent} />
            <Text style={styles.oceanLabel}>{t('sea_temp')}</Text>
          </View>
          <Text style={styles.oceanValue}>{weather.seaTemp}°C</Text>
        </View>

        <View style={styles.oceanChip}>
          <View style={styles.oceanChipHeader}>
            <Icon name="leaf" size={13} color={Colors.primaryAccent} />
            <Text style={styles.oceanLabel}>{t('chlorophyll')}</Text>
          </View>
          <Text style={styles.oceanValue}>
            {weather.chlorophyll} {weather.chlorophyllUnit}
          </Text>
        </View>
      </View>

      {/* Updated Timestamp */}
      <Text style={styles.updated}>{weather.updatedAgo || t('updated_ago')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    ...Shadows.card,
    marginBottom: Spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  safetyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  safetyBadgeText: {
    ...Typography.chip,
    fontWeight: '700',
    fontSize: 11,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  weatherIcon: {
    marginRight: 2,
  },
  temperature: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  metricLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '600',
  },
  metricValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12.5,
    marginLeft: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm - 2,
  },
  oceanRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  oceanChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oceanChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  oceanLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  oceanValue: {
    ...Typography.body,
    color: Colors.primaryAccentDark,
    fontWeight: '800',
    fontSize: 12.5,
  },
  updated: {
    ...Typography.micro,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 9.5,
  },
});

export default WeatherCard;
