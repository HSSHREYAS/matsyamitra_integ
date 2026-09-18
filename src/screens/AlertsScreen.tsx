/**
 * AlertsScreen — Alerts & Notices with filter chips and alert cards
 * Connected to live backend /api/v1/alerts with fallback to mock notices.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import FilterChips from '../components/alerts/FilterChips';
import EmptyState from '../components/alerts/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import { useAlerts, type AlertItem } from '../services/api';
import { useLanguage } from '../i18n';
import { useNavigation } from '@react-navigation/native';

const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  // Live backend hook
  const { alerts: liveAlerts, isLoading, isOnline, refresh } = useAlerts();

  // Pure live alerts from FastAPI
  const alerts = useMemo<AlertItem[]>(() => {
    return liveAlerts ?? [];
  }, [liveAlerts]);

  // Auto-refresh alerts when user navigates to this tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refresh();
    });
    return unsubscribe;
  }, [navigation, refresh]);

  // Dynamic filter items with real count badges
  const filterItems = useMemo(() => {
    const advisoryCount = alerts.filter((a) => a.category === 'advisory').length;
    const weatherCount = alerts.filter((a) => a.category === 'weather').length;
    const officialCount = alerts.filter((a) => a.category === 'official').length;
    const newsCount = alerts.filter((a) => a.category === 'news').length;

    return [
      { key: 'all', label: `${t('alerts_filter_all')} (${alerts.length})` },
      { key: 'advisory', label: `${t('alerts_filter_advisory')} (${advisoryCount})` },
      { key: 'weather', label: `${t('alerts_filter_weather')} (${weatherCount})` },
      { key: 'official', label: `${t('alerts_filter_official')} (${officialCount})` },
      { key: 'news', label: `${t('alerts_filter_news')} (${newsCount})` },
    ];
  }, [alerts, t]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter.toLowerCase() === 'all') return alerts;
    return alerts.filter(
      (alert) => alert.category.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [activeFilter, alerts]);

  const handleNavigateToMap = useCallback((alert: AlertItem) => {
    setSelectedAlert(null);
    navigation.navigate('Map', { targetAlertId: alert.id });
  }, [navigation]);

  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <AlertCard alert={item} onPress={() => setSelectedAlert(item)} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.leftAction}>
          <Icon name="bell-ring" size={22} color={Colors.primaryAccent} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>{t('alerts_screen_title')}</Text>
          <View style={styles.subStatusRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isOnline ? Colors.safe : Colors.caution },
              ]}
            />
            <Text style={styles.subStatusText}>
              {isOnline ? t('alerts_live_connected') : t('alerts_offline_cached')}
              {alerts.length > 0 ? ` • ${alerts.length} Active` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => refresh()} style={styles.refreshButton}>
          <Icon name="refresh" size={22} color={Colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <FilterChips
        filters={filterItems}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Content */}
      {showEmpty || filteredAlerts.length === 0 ? (
        <EmptyState onRefresh={() => { setShowEmpty(false); refresh(); }} />
      ) : (
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={Colors.primaryAccent}
              colors={[Colors.primaryAccent]}
            />
          }
        />
      )}

      {/* Alert Detail Modal */}
      <AlertDetailModal
        visible={selectedAlert !== null}
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onNavigateToMap={handleNavigateToMap}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  leftAction: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subStatusText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
});

export default AlertsScreen;
