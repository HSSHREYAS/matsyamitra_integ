/**
 * MetricChip — Displays an icon + label + value metric
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, BorderRadius, Typography, Spacing } from '../../theme';

interface MetricChipProps {
  icon: string;
  label: string;
  value: string;
  iconColor?: string;
  style?: ViewStyle;
  variant?: 'light' | 'dark' | 'outlined';
}

const MetricChip: React.FC<MetricChipProps> = ({
  icon,
  label,
  value,
  iconColor = Colors.primaryAccent,
  style,
  variant = 'dark',
}) => {
  const isLight = variant === 'light';
  const isOutlined = variant === 'outlined';

  return (
    <View
      style={[
        styles.container,
        isLight && styles.containerLight,
        isOutlined && styles.containerOutlined,
        style,
      ]}>
      <Icon
        name={icon}
        size={16}
        color={iconColor}
        style={styles.icon}
      />
      <View>
        <Text
          style={[
            styles.label,
            isLight && styles.labelLight,
          ]}>
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            isLight && styles.valueLight,
          ]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  containerLight: {
    backgroundColor: Colors.cardBackground,
  },
  containerOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  icon: {
    marginRight: 2,
  },
  label: {
    ...Typography.chip,
    color: Colors.textSubtleOnDark,
    textTransform: 'uppercase',
  },
  labelLight: {
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.body,
    color: Colors.textOnDark,
    fontWeight: '600',
  },
  valueLight: {
    color: Colors.textPrimary,
  },
});

export default MetricChip;
