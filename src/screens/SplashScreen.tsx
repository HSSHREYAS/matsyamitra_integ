/**
 * SplashScreen — Animated splash with logo, taglines, and loading bar
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing } from '../theme';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const kannadaOpacity = useRef(new Animated.Value(0)).current;
  const loadingWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // 1. Background fades in (0–300ms)
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),


      // 2. Icon scales up + fades in (300–700ms)
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 3. Title fades in + drifts upward (600–900ms)
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // 4. Taglines fade in (800–1100ms)
      Animated.stagger(200, [
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(kannadaOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // 5. Loading bar fills (1000–2000ms)
      Animated.timing(loadingWidth, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),

      // 6. Screen fades out (2000–2500ms)
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  const loadingBarWidth = loadingWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F7FF" />
      <LinearGradient
        colors={['#F0F7FF', '#FFFFFF']}
        style={styles.gradient}>
        <Animated.View style={[styles.content, { opacity: bgOpacity }]}>
          {/* App Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: iconOpacity,
                transform: [{ scale: iconScale }],
              },
            ]}>
            <Image
              source={require('../assets/images/logo_dark.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App Name */}
          <Animated.Text
            style={[
              styles.appName,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslate }],
              },
            ]}>
            MatsyaMitra
          </Animated.Text>

          {/* English Tagline */}
          <Animated.Text
            style={[styles.tagline, { opacity: taglineOpacity }]}>
            YOUR COASTAL COMPANION
          </Animated.Text>

          {/* Kannada Tagline */}
          <Animated.Text
            style={[styles.kannadaText, { opacity: kannadaOpacity }]}>
            ನಿಮ್ಮ ಕರಾವಳಿ ಸಂಗಾತಿ
          </Animated.Text>

          {/* Loading Bar */}
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingBar,
                { width: loadingBarWidth },
              ]}
            />
          </View>

          {/* Footer text */}
          <Text style={styles.footerText}>
            MARINE GRADE SECURITY & PRECISION
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primaryBackground,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primaryAccent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  kannadaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
  loadingContainer: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(15, 166, 136, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.massive,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: Colors.primaryAccent,
    borderRadius: 2,
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
