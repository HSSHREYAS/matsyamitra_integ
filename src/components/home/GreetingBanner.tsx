/**
 * GreetingBanner — Home screen hero banner with personalized greeting and sunrise illustration
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useLanguage } from '../../i18n';

interface GreetingBannerProps {
  userName?: string;
}

const GreetingBanner: React.FC<GreetingBannerProps> = ({ userName }) => {
  const { t } = useLanguage();

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  }, [t]);

  const displayName = userName || t('user_full_name');

  return (
    <View style={styles.container}>
      {/* Personalized Greeting Header */}
      <View style={styles.greetingHeader}>
        <Text style={styles.greetingPrefix}>
          {greetingTime}, <Text style={styles.userName}>{displayName}</Text>
        </Text>
      </View>

      {/* Hero Panoramic Banner Card */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={require('../../assets/images/hero_sunrise.jpg')}
          style={styles.imageBackground}
          resizeMode="cover">
          {/* Subtle dark-teal gradient overlay to ensure perfect text contrast */}
          <LinearGradient
            colors={[
              'rgba(10, 37, 64, 0.78)',
              'rgba(13, 40, 68, 0.55)',
              'rgba(10, 37, 64, 0.15)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientOverlay}>
            <View style={styles.textContainer}>
              <Text style={styles.kannadaSlogan}>
                {t('banner_slogan_kn')}
              </Text>
              <Text style={styles.englishSubtitle}>
                {t('banner_slogan_en')}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm + 2,
  },
  greetingHeader: {
    marginBottom: Spacing.xs + 2,
  },
  greetingPrefix: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  userName: {
    fontWeight: '800',
    color: Colors.primaryAccentDark,
  },
  cardContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  imageBackground: {
    width: '100%',
    height: 104,
    justifyContent: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  textContainer: {
    maxWidth: '75%',
  },
  kannadaSlogan: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  englishSubtitle: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default GreetingBanner;
