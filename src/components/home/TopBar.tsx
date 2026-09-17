/**
 * TopBar — Transparent overlay top bar for the ocean sunrise hero header.
 * Displays white brand trawler, dual-script title, slogan, frosted language switcher, and notification bell.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../i18n';

interface TopBarProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onLanguageToggle?: () => void;
  language?: 'en' | 'kn';
  unreadCount?: number;
}

const TopBar: React.FC<TopBarProps> = ({
  onNotificationPress,
  onLanguageToggle,
  language: propLanguage,
  unreadCount = 0,
}) => {
  const { language: ctxLanguage, toggleLanguage, setLanguage } = useLanguage();
  const currentLang = propLanguage || ctxLanguage;

  return (
    <View style={styles.container}>
      {/* Left: Boat Logo + Dual-Line Brand & Slogan */}
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <View style={styles.logoContainer}>
            <Icon name="sail-boat" size={28} color="#FFFFFF" />
            <View style={styles.waveLines}>
              <View style={styles.waveLine1} />
              <View style={styles.waveLine2} />
            </View>
          </View>
          <View style={styles.titleColumn}>
            <Text style={styles.appNameEn}>MatsyaMitra</Text>
            <Text style={styles.appNameKn}>ಮತ್ಸ್ಯಮಿತ್ರ</Text>
          </View>
        </View>

        {/* Dual-Line Sub-Slogan */}
        <View style={styles.sloganContainer}>
          <Text style={styles.sloganKn}>ನಮ್ಮ ಸಮುದ್ರ, ನಮ್ಮ ಸ್ನೇಹಿತ</Text>
          <Text style={styles.sloganEn}>Safer Seas • Better Catch</Text>
        </View>
      </View>

      {/* Right: Frosted Language Capsule & Frosted Bell */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={toggleLanguage}
          style={styles.langCapsule}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={[styles.langOption, currentLang === 'kn' && styles.langOptionActive]}>
            <Text style={[styles.langText, currentLang === 'kn' && styles.langTextActive]}>
              KN
            </Text>
          </View>
          <View style={[styles.langOption, currentLang === 'en' && styles.langOptionActive]}>
            <Text style={[styles.langText, currentLang === 'en' && styles.langTextActive]}>
              EN
            </Text>
          </View>
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.bellButton}
          activeOpacity={0.7}>
          <Icon name="bell" size={20} color="#FFFFFF" />
          {unreadCount > 0 && <View style={styles.bellBadge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: (StatusBar.currentHeight || 28) + 4,
    paddingBottom: 6,
    backgroundColor: 'transparent',
  },
  left: {
    flex: 1,
    paddingRight: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveLines: {
    marginTop: -2,
    alignItems: 'center',
    gap: 2,
  },
  waveLine1: {
    width: 26,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 1,
  },
  waveLine2: {
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 1,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  appNameEn: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  appNameKn: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  sloganContainer: {
    marginTop: 6,
  },
  sloganKn: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  sloganEn: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  langCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 18,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  langOption: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  langOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langTextActive: {
    color: '#0A2540',
  },
  bellButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default TopBar;
