/**
 * LocationRow — Displays current location with dropdown
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing } from '../../theme';

interface LocationRowProps {
  location: string;
  onPress?: () => void;
}

const LocationRow: React.FC<LocationRowProps> = ({ location, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Current location: ${location}. Tap to change coastal location`}>
      <View style={styles.pill}>
        <Icon name="map-marker" size={18} color={Colors.primaryAccent} />
        <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
          {location}
        </Text>
        <Icon
          name="chevron-down"
          size={18}
          color={Colors.primaryAccent}
          style={styles.chevronIcon}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.xs,
  },
  locationText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnDark,
    flexShrink: 1,
  },
  chevronIcon: {
    marginLeft: 2,
  },
});

export default LocationRow;
