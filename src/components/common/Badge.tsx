/**
 * Badge — Reusable severity/status badge component
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../theme';

type BadgeVariant = 'safe' | 'caution' | 'danger' | 'info' | 'seasonal' | 'teal' | 'urgent';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  style?: ViewStyle;
  small?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  safe: { bg: Colors.safeBg, text: Colors.safe },
  caution: { bg: Colors.cautionBg, text: Colors.caution },
  danger: { bg: Colors.dangerBg, text: Colors.danger },
  urgent: { bg: Colors.dangerBg, text: Colors.danger },
  info: { bg: Colors.infoBg, text: Colors.info },
  seasonal: { bg: Colors.secondaryBackground, text: Colors.textOnDark },
  teal: { bg: Colors.primaryAccentLight, text: Colors.primaryAccent },
};

const Badge: React.FC<BadgeProps> = ({ label, variant, style, small }) => {
  const vStyle = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: vStyle.bg },
        small && styles.badgeSmall,
        style,
      ]}>
      <Text
        style={[
          styles.badgeText,
          { color: vStyle.text },
          small && styles.badgeTextSmall,
        ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    ...Typography.chip,
    textTransform: 'uppercase',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
});

export default Badge;
