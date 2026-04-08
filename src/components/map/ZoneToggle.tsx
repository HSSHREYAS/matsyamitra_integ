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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.lg + 50,
    left: Spacing.xxl,
    right: Spacing.xxl,
    zIndex: 10,
    ...Shadows.fab,
  },
});

export default ZoneToggle;
