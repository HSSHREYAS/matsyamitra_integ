/**
 * LocationRow — Displays current location in a crisp white rounded card
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

interface LocationRowProps {
  location: string;
  onPress?: () => void;
}

const LocationRow: React.FC<LocationRowProps> = ({ location, onPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.pill}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Current location: ${location}. Tap to change coastal location`}>
        <View style={styles.leftRow}>
          <Icon name="map-marker" size={18} color={Colors.oceanBlue} />
          <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
            {location}
          </Text>
        </View>
        <Icon
          name="chevron-right"
          size={20}
          color={Colors.textMuted}
          style={styles.chevronIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  locationText: {
    ...Typography.body,
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  chevronIcon: {
    marginLeft: Spacing.xs,
  },
});

export default LocationRow;

