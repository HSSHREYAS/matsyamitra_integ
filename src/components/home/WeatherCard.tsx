/**
 * WeatherCard — Crisp white card with 3+2 light-blue tiles for real-time GEE satellite & physical observations.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
        bg: '#FEE2E2',
        text: '#DC2626',
      };
    }
    if (c.includes('MODERATE') || c.includes('WIND') || c.includes('CAUTION')) {
      return {
        label: t('caution_to_fish'),
        bg: '#FEF3C7',
        text: '#D97706',
      };
    }
    return {
      label: t('safe_to_fish'),
      bg: '#DCFCE7',
      text: '#15803D',
    };
  }, [weather.condition, t]);

  const conditionDisplay = useMemo(() => {
    const c = (weather.condition || '').toUpperCase();
    if (c.includes('ROUGH') || c.includes('DANGER')) return t('cond_rough_sea');
    if (c.includes('MODERATE')) return t('cond_moderate');
    return t('cond_clear_calm');
  }, [weather.condition, t]);

  return (
    <View style={styles.card}>
      {/* Top Row: Current Temp + Condition on Left, Safety Pill on Right */}
      <View style={styles.topRow}>
        <View style={styles.tempLeftGroup}>
          <Icon name="weather-sunny" size={42} color="#F59E0B" style={styles.sunIcon} />
          <View style={styles.tempTextColumn}>
            <Text style={styles.temperature}>{weather.temperature}°C</Text>
            <Text style={styles.conditionText}>{conditionDisplay}</Text>
          </View>
        </View>

        <View style={[styles.safetyBadge, { backgroundColor: safetyBadge.bg }]}>
          <Text style={[styles.safetyBadgeText, { color: safetyBadge.text }]}>
            {safetyBadge.label}
          </Text>
        </View>
      </View>

      {/* Row 1: 3 Light-Blue Rounded Tiles (Wind, Waves, Humidity) */}
      <View style={styles.metricsRow}>
        {/* Wind Tile */}
        <View style={styles.metricTile}>
          <Icon name="weather-windy" size={20} color="#0D9488" style={styles.tileIcon} />
          <Text style={styles.tileLabel}>{t('wind_label')}</Text>
          <Text style={styles.tileValue} numberOfLines={1}>
            {weather.windSpeed} km/h
          </Text>
        </View>

        {/* Waves Tile */}
        <View style={styles.metricTile}>
          <Icon name="wave" size={20} color="#0284C7" style={styles.tileIcon} />
          <Text style={styles.tileLabel}>{t('waves_label')}</Text>
          <Text style={styles.tileValue} numberOfLines={1}>
            {weather.waveHeight} m
          </Text>
        </View>

        {/* Humidity Tile */}
        <View style={styles.metricTile}>
          <Icon name="water-percent" size={20} color="#0284C7" style={styles.tileIcon} />
          <Text style={styles.tileLabel}>{t('humidity_label')}</Text>
          <Text style={styles.tileValue} numberOfLines={1}>
            {weather.humidity}%
          </Text>
        </View>
      </View>

      {/* Row 2: 2 Wider Light-Blue Rounded Tiles (Sea Temp & Chlorophyll from GEE) */}
      <View style={styles.oceanRow}>
        {/* Sea Temp Tile */}
        <View style={styles.oceanTile}>
          <Icon name="thermometer" size={22} color="#0D9488" />
          <View style={styles.oceanTileTexts}>
            <Text style={styles.oceanTileLabel}>{t('sea_temp_label')}</Text>
            <Text style={styles.oceanTileValue}>{weather.seaTemp}°C</Text>
          </View>
        </View>

        {/* Chlorophyll Tile */}
        <View style={styles.oceanTile}>
          <Icon name="arrow-down-circle" size={22} color="#0D9488" />
          <View style={styles.oceanTileTexts}>
            <Text style={styles.oceanTileLabel}>{t('chlorophyll_label')}</Text>
            <Text style={styles.oceanTileValue} numberOfLines={1}>
              {weather.chlorophyll} {weather.chlorophyllUnit || 'mg/m³'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tempLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sunIcon: {
    marginRight: 2,
  },
  tempTextColumn: {
    justifyContent: 'center',
  },
  temperature: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A2540',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  safetyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyBadgeText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tileIcon: {
    marginBottom: 3,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0A2540',
  },
  oceanRow: {
    flexDirection: 'row',
    gap: 8,
  },
  oceanTile: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oceanTileTexts: {
    flex: 1,
    justifyContent: 'center',
  },
  oceanTileLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 1,
  },
  oceanTileValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A2540',
  },
});

export default WeatherCard;
