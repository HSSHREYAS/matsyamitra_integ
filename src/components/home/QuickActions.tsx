/**
 * QuickActions — 2×2 grid of quick action buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  onPress?: () => void;
}

const defaultActions: QuickAction[] = [
  { id: 'fleet', icon: 'sail-boat', label: 'Fleet Tracking' },
  { id: 'catch', icon: 'fish', label: 'Catch Logs' },
  { id: 'distress', icon: 'alert-octagon', label: 'Distress Alerts' },
  { id: 'equipment', icon: 'wrench', label: 'Equipment' },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.card}
            onPress={action.onPress}
            activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Icon
                name={action.icon}
                size={28}
                color={Colors.primaryAccent}
              />
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default QuickActions;
