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
      activeOpacity={0.7}>
      <Icon name="map-marker" size={18} color={Colors.primaryAccent} />
      <Text style={styles.locationText}>{location}</Text>
      <Icon
        name="chevron-down"
        size={18}
        color={Colors.textSubtleOnDark}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  locationText: {
    ...Typography.body,
    color: Colors.textOnDark,
  },
});

export default LocationRow;
