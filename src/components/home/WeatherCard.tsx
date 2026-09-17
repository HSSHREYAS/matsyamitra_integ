/**
 * WeatherCard — Hero weather card with temperature, metrics, and ocean data
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { WeatherData } from '../../data/mockWeather';
import { useLanguage } from '../../i18n';

interface WeatherCardProps {
  weather: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  const { t } = useLanguage();

  const conditionText = useMemo(() => {
    const c = (weather.condition || '').toUpperCase();
    if (c.includes('CLEAR') || c.includes('CALM')) return t('cond_clear_calm');
    if (c.includes('ROUGH')) return t('cond_rough_sea');
    if (c.includes('MODERATE')) return t('cond_moderate');
    if (c.includes('WIND') || c.includes('GALE')) return t('cond_high_wind');
    return weather.condition;
  }, [weather.condition, t]);

  const windUnit = weather.windUnit === 'km/h' ? t('km_per_hour') : weather.windUnit;
  const waveUnit = weather.waveUnit === 'm' ? ` ${t('meters')}` : weather.waveUnit;

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['#0D2844', '#142D4C', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        {/* Condition badge */}
        <View style={styles.topRow}>
          <View style={styles.conditionBadge}>
            <Icon name={weather.conditionIcon} size={14} color={Colors.primaryAccent} />
            <Text style={styles.conditionText}>{conditionText}</Text>
          </View>
        </View>

        {/* Temperature */}
        <View style={styles.tempRow}>
          <Icon
            name={weather.conditionIcon}
            size={48}
            color="#FFD93D"
            style={styles.weatherIcon}
          />
          <Text style={styles.temperature}>{weather.temperature}°C</Text>
        </View>

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('wind_speed')}</Text>
            <View style={styles.metricValueRow}>
              <Icon name="weather-windy" size={14} color={Colors.primaryAccent} />
              <Text style={styles.metricValue}>
                {weather.windSpeed} {windUnit}
              </Text>
            </View>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('wave_height')}</Text>
            <View style={styles.metricValueRow}>
              <Icon name="wave" size={14} color={Colors.primaryAccent} />
              <Text style={styles.metricValue}>
                {weather.waveHeight}{waveUnit}
              </Text>
            </View>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('humidity')}</Text>
            <View style={styles.metricValueRow}>
              <Icon name="water-percent" size={14} color={Colors.primaryAccent} />
              <Text style={styles.metricValue}>{weather.humidity}%</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Ocean data */}
        <View style={styles.oceanRow}>
          <View style={styles.oceanChip}>
            <Text style={styles.oceanLabel}>{t('sea_temp')}</Text>
            <Text style={styles.oceanValue}>{weather.seaTemp}°C</Text>
          </View>
          <View style={styles.oceanChip}>
            <Text style={styles.oceanLabel}>{t('chlorophyll')}</Text>
            <Text style={styles.oceanValue}>
              {weather.chlorophyll} {weather.chlorophyllUnit}
            </Text>
          </View>
        </View>

        {/* Updated timestamp */}
        <Text style={styles.updated}>{weather.updatedAgo}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.cardHeavy,
  },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 166, 136, 0.3)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conditionText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  weatherIcon: {
    marginRight: 4,
  },
  temperature: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    ...Typography.body,
    color: Colors.textOnDark,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.md,
  },
  oceanRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  oceanChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  oceanLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  oceanValue: {
    ...Typography.body,
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  updated: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default WeatherCard;
