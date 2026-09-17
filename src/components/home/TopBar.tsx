/**
 * TopBar — Home screen top bar with brand icon, subtitle, language pill, and notification bell
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useLanguage } from '../../i18n';

interface TopBarProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onLanguageToggle?: () => void;
  language?: 'en' | 'kn';
}

const TopBar: React.FC<TopBarProps> = ({
  onMenuPress,
  onNotificationPress,
  onLanguageToggle,
  language: propLanguage,
}) => {
  const { language: ctxLanguage, toggleLanguage, t } = useLanguage();
  const currentLang = propLanguage || ctxLanguage;
  const handleToggle = onLanguageToggle || toggleLanguage;

  return (
    <View style={styles.container}>
      {/* Brand & Subtitle */}
      <View style={styles.left}>
        <View style={styles.logoIconContainer}>
          <Icon name="sail-boat" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.brandColumn}>
          <Text style={styles.appName}>{t('app_name')}</Text>
          <Text style={styles.appSubtitle}>{t('app_subtitle')}</Text>
        </View>
      </View>

      {/* Language Toggle & Notification */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={handleToggle}
          style={styles.langToggleContainer}
          activeOpacity={0.8}>
          <View
            style={[
              styles.langPill,
              currentLang === 'en' && styles.langPillActive,
            ]}>
            <Text
              style={[
                styles.langText,
                currentLang === 'en' && styles.langTextActive,
              ]}>
              EN
            </Text>
          </View>
          <View
            style={[
              styles.langPill,
              currentLang === 'kn' && styles.langPillActive,
            ]}>
            <Text
              style={[
                styles.langText,
                currentLang === 'kn' && styles.langTextActive,
              ]}>
              ಕನ್ನಡ
            </Text>
          </View>
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={onNotificationPress || onMenuPress}
          style={styles.bellButton}
          activeOpacity={0.7}>
          <Icon name="bell-outline" size={22} color={Colors.textPrimary} />
          <View style={styles.bellBadge} />
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
    paddingTop: (StatusBar.currentHeight || 24) + 6,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.primaryBackground,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  logoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  brandColumn: {
    justifyContent: 'center',
  },
  appName: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  appSubtitle: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  langToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.pill,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 2,
  },
  langPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  langPillActive: {
    backgroundColor: Colors.textPrimary,
  },
  langText: {
    ...Typography.chip,
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  langTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bellButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: BorderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.danger,
  },
});

export default TopBar;

