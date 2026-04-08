/**
 * MatsyaMitra Design System — Typography
 *
 * Note: For React Native CLI, we need to link fonts manually.
 * Fonts are referenced by their PostScript name on each platform.
 * We'll use system fonts as fallback until custom fonts are linked.
 */

import { Platform } from 'react-native';

// Font family references
// To use Plus Jakarta Sans & Inter, the TTF/OTF files should
// be placed in src/assets/fonts/ and linked via react-native.config.js
// For now, these fall back to system fonts gracefully.
export const FontFamily = {
  headingBold: Platform.select({
    android: 'PlusJakartaSans-Bold',
    ios: 'PlusJakartaSans-Bold',
    default: 'System',
  }),
  headingSemiBold: Platform.select({
    android: 'PlusJakartaSans-SemiBold',
    ios: 'PlusJakartaSans-SemiBold',
    default: 'System',
  }),
  headingMedium: Platform.select({
    android: 'PlusJakartaSans-Medium',
    ios: 'PlusJakartaSans-Medium',
    default: 'System',
  }),
  bodyRegular: Platform.select({
    android: 'Inter-Regular',
    ios: 'Inter-Regular',
    default: 'System',
  }),
  bodyMedium: Platform.select({
    android: 'Inter-Medium',
    ios: 'Inter-Medium',
    default: 'System',
  }),
  bodySemiBold: Platform.select({
    android: 'Inter-SemiBold',
    ios: 'Inter-SemiBold',
    default: 'System',
  }),
};

// Font size scale
export const FontSize = {
  appName: 28,
  heroTemp: 48,
  screenTitle: 18,
  sectionTitle: 16,
  cardTitle: 15,
  body: 14,
  bodySmall: 13,
  label: 12,
  chip: 11,
  micro: 10,
};

// Pre-composed text styles
export const Typography = {
  appName: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.appName,
    fontWeight: '700' as const,
  },
  screenTitle: {
    fontFamily: FontFamily.headingSemiBold,
    fontSize: FontSize.screenTitle,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingSemiBold,
    fontSize: FontSize.sectionTitle,
    fontWeight: '600' as const,
  },
  cardTitle: {
    fontFamily: FontFamily.headingSemiBold,
    fontSize: FontSize.cardTitle,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.body,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.bodySmall,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.label,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  chip: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.chip,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  micro: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.micro,
    fontWeight: '400' as const,
    letterSpacing: 1.5,
  },
  heroTemp: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.heroTemp,
    fontWeight: '700' as const,
  },
};

export default Typography;
