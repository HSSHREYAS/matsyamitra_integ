/**
 * ZoneToggle — Floating pill toggle for Fishing Zones / Risk Zones
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import PillToggle from '../common/PillToggle';
import { Colors, Spacing, Shadows } from '../../theme';

interface ZoneToggleProps {
  activeIndex: number;
  onToggle: (index: number) => void;
}

const ZoneToggle: React.FC<ZoneToggleProps> = ({ activeIndex, onToggle }) => {
  return (
    <View style={styles.container}>
      <PillToggle
        options={['Fishing Zones', 'Risk Zones']}
        activeIndex={activeIndex}
        onToggle={onToggle}
        activeColor={activeIndex === 0 ? Colors.primaryAccent : Colors.danger}
        inactiveTextColor={Colors.textPrimary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 96,
    left: Spacing.xl,
    width: 240,
    zIndex: 14,
    ...Shadows.fab,
    elevation: 10,
  },
});

export default ZoneToggle;
