/**
 * AlertsScreen — Alerts & Notices with filter chips and alert cards
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing } from '../theme';
import FilterChips from '../components/alerts/FilterChips';
import EmptyState from '../components/alerts/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import { mockAlerts } from '../data/mockAlerts';
import type { AlertItem } from '../data/mockAlerts';

const FILTERS = ['All', 'Official', 'Weather', 'Advisory', 'News'];

const AlertsScreen: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showEmpty, setShowEmpty] = useState(false); // Toggle for demo

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'All') return mockAlerts;
    return mockAlerts.filter(
      (alert) =>
        alert.category.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [activeFilter]);

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
        <Text style={styles.topBarTitle}>Alerts & Notices</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Icon name="magnify" size={24} color={Colors.textOnDark} />
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
        <EmptyState onRefresh={() => setShowEmpty(false)} />
      ) : (
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
  },
  listContent: {
    paddingBottom: 100,
  },
});

export default AlertsScreen;
