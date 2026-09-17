/**
 * TopBar — Home screen top bar with app name, Pro badge, and menu
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useLanguage } from '../../i18n';

interface TopBarProps {
  onMenuPress?: () => void;
  onLanguageToggle?: () => void;
  language?: 'en' | 'kn';
}

const TopBar: React.FC<TopBarProps> = ({
  onMenuPress,
  onLanguageToggle,
  language: propLanguage,
}) => {
  const { language: ctxLanguage, toggleLanguage, t } = useLanguage();
  const currentLang = propLanguage || ctxLanguage;
  const handleToggle = onLanguageToggle || toggleLanguage;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.appName}>{t('app_name')}</Text>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>{t('badge_pro')}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <TouchableOpacity
          onPress={handleToggle}
          style={styles.langToggle}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.langOption,
              currentLang === 'en' && styles.langActive,
            ]}>
            EN
          </Text>
          <Text style={styles.langDivider}>|</Text>
          <Text
            style={[
              styles.langOption,
              currentLang === 'kn' && styles.langActive,
            ]}>
            ಕನ್ನಡ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuButton}
          activeOpacity={0.7}>
          <Icon name="menu" size={24} color={Colors.textOnDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appName: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
    fontWeight: '700',
    fontSize: 20,
  },
  proBadge: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proText: {
    ...Typography.chip,
    color: Colors.textOnDark,
    fontWeight: '700',
    fontSize: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langOption: {
    ...Typography.chip,
    color: Colors.textSubtleOnDark,
  },
  langActive: {
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  langDivider: {
    color: Colors.textSubtleOnDark,
    marginHorizontal: 4,
    fontSize: 10,
  },
  menuButton: {
    padding: 4,
  },
});

export default TopBar;
