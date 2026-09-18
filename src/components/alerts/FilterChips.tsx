/**
 * FilterChips — Horizontal scrollable filter chip row
 */

import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

export interface FilterItem {
  key: string;
  label: string;
}

interface FilterChipsProps {
  filters: (string | FilterItem)[];
  activeFilter: string;
  onFilterChange: (filterKey: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {filters.map((filter) => {
          const key = typeof filter === 'string' ? filter : filter.key;
          const label = typeof filter === 'string' ? filter : filter.label;
          const isActive = key.toLowerCase() === activeFilter.toLowerCase();
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onFilterChange(key)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chipActive: {
    backgroundColor: Colors.primaryAccent,
    borderColor: Colors.primaryAccent,
    elevation: 4,
    shadowOpacity: 0.15,
  },
  chipText: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default FilterChips;
