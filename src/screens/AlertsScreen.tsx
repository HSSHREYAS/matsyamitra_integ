/**
 * AlertsScreen — Alerts & Notices with filter chips and alert cards
 * Connected to live backend /api/v1/alerts with fallback to mock notices.
 */

import React, { useState, useMemo } from 'react';
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
import { Colors, Typography, Spacing } from '../theme';
import FilterChips from '../components/alerts/FilterChips';
import EmptyState from '../components/alerts/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import { useAlerts, type AlertItem } from '../services/api';

const FILTERS = ['All', 'Official', 'Weather', 'Advisory', 'News'];

const AlertsScreen: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showEmpty, setShowEmpty] = useState(false);

  // Live backend hook
  const { alerts: liveAlerts, isLoading, isOnline, refresh } = useAlerts();

  // Pure live alerts from FastAPI
  const alerts = useMemo<AlertItem[]>(() => {
    return liveAlerts ?? [];
  }, [liveAlerts]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'All') return alerts;
    return alerts.filter(
      (alert) => alert.category.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [activeFilter, alerts]);

  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <AlertCard alert={item} onPress={() => {}} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7}>
          <Icon name="menu" size={24} color={Colors.textOnDark} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Alerts & Notices</Text>
          <Text style={styles.subStatusText}>
            {isOnline ? 'LIVE FEED CONNECTED' : 'OFFLINE / CACHED NOTICES'}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => refresh()}>
          <Icon name="refresh" size={22} color={Colors.primaryAccent} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <FilterChips
        filters={FILTERS}
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
  },
  titleContainer: {
    alignItems: 'center',
  },
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
  },
  subStatusText: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 100,
  },
});

export default AlertsScreen;
