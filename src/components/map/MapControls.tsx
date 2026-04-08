/**
 * MapControls — Floating zoom and location buttons
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Shadows, BorderRadius } from '../../theme';

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onMyLocation?: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onMyLocation,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={onZoomIn}
        activeOpacity={0.7}>
        <Icon name="plus" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={onZoomOut}
        activeOpacity={0.7}>
        <Icon name="minus" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.locationButton]}
        onPress={onMyLocation}
        activeOpacity={0.7}>
        <Icon name="crosshairs-gps" size={22} color={Colors.textOnDark} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.lg,
    top: 130,
    gap: Spacing.sm,
    zIndex: 10,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  locationButton: {
    backgroundColor: Colors.primaryAccent,
  },
});

export default MapControls;
