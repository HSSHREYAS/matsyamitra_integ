/**
 * QuickActions — 2×2 grid of quick action buttons
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useLanguage, type TranslationKey } from '../../i18n';

interface QuickAction {
  id: string;
  icon: string;
  label?: string;
  labelKey?: TranslationKey;
  onPress?: () => void;
}

const defaultActions: QuickAction[] = [
  { id: 'fleet', icon: 'sail-boat', labelKey: 'qa_fleet', label: 'Fleet Tracking' },
  { id: 'catch', icon: 'fish', labelKey: 'qa_catch', label: 'Catch Logs' },
  { id: 'distress', icon: 'alert-octagon', labelKey: 'qa_distress', label: 'Distress Alerts' },
  { id: 'equipment', icon: 'wrench', labelKey: 'qa_equipment', label: 'Equipment' },
];

interface QuickActionsProps {
  actions?: QuickAction[];
  onActionPress?: (actionId: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
  onActionPress,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => {
          const displayLabel = action.labelKey ? t(action.labelKey) : action.label;
          return (
            <TouchableOpacity
              key={action.id}
              style={styles.card}
              onPress={() => {
                if (action.onPress) {
                  action.onPress();
                } else if (onActionPress) {
                  onActionPress(action.id);
                }
              }}
              activeOpacity={0.7}>
              <View style={styles.iconContainer}>
                <Icon
                  name={action.icon}
                  size={20}
                  color={Colors.primaryAccent}
                />
              </View>
              <Text style={styles.label} numberOfLines={1}>{displayLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  label: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default QuickActions;

