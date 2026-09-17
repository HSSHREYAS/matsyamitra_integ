/**
 * ProfileScreen — Basic profile screen (placeholder until user provides design)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useLanguage } from '../i18n';

const ProfileScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);

  const profileSections = [
    {
      title: 'Vessel Information',
      items: [
        { icon: 'sail-boat', label: 'Vessel Name', value: 'Sagar Rani' },
        { icon: 'card-account-details', label: 'Registration', value: 'KA-MNG-2024-1856' },
        { icon: 'ruler', label: 'Vessel Type', value: 'Mechanized Trawler (12m)' },
      ],
    },
    {
      title: 'Location Settings',
      items: [
        { icon: 'map-marker', label: 'Default Port', value: 'Mangalore Old Port' },
        { icon: 'compass', label: 'Coverage Area', value: 'Karnataka Coast' },
        { icon: 'map', label: 'Preferred Zones', value: 'Zone 42-B, Zone 38-A' },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Icon name="cog" size={24} color={Colors.textSubtleOnDark} />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="account" size={40} color={Colors.primaryAccent} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Ramesh Kumar</Text>
          <Text style={styles.profileSubtitle}>Fisherman • Mangalore</Text>
          <View style={styles.verifiedRow}>
            <Icon name="check-decagram" size={16} color={Colors.primaryAccent} />
            <Text style={styles.verifiedText}>Verified Fisher ID</Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>156</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Years Exp.</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4.8</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Profile Sections */}
      {profileSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.sectionItem,
                  index < section.items.length - 1 && styles.sectionItemBorder,
                ]}>
                <View style={styles.sectionItemLeft}>
                  <Icon name={item.icon} size={20} color={Colors.primaryAccent} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </View>
                <Text style={styles.itemValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Language Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'kn' ? 'ಭಾಷೆ (Language)' : 'Language'}
        </Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.toggleItem, { paddingVertical: Spacing.md }]}
            onPress={() => setLanguage('en')}
            activeOpacity={0.7}>
            <View style={styles.sectionItemLeft}>
              <Icon name="translate" size={20} color={Colors.primaryAccent} />
              <Text style={styles.itemLabel}>English</Text>
            </View>
            {language === 'en' && (
              <Icon name="check-circle" size={22} color={Colors.primaryAccent} />
            )}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={[styles.toggleItem, { paddingVertical: Spacing.md }]}
            onPress={() => setLanguage('kn')}
            activeOpacity={0.7}>
            <View style={styles.sectionItemLeft}>
              <Icon name="translate" size={20} color={Colors.primaryAccent} />
              <Text style={styles.itemLabel}>ಕನ್ನಡ (Coastal Kannada)</Text>
            </View>
            {language === 'kn' && (
              <Icon name="check-circle" size={22} color={Colors.primaryAccent} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionCard}>
          <View style={styles.toggleItem}>
            <View style={styles.sectionItemLeft}>
              <Icon name="bell" size={20} color={Colors.primaryAccent} />
              <Text style={styles.itemLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#767577', true: Colors.primaryAccentLight }}
              thumbColor={pushNotifications ? Colors.primaryAccent : '#f4f3f4'}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleItem}>
            <View style={styles.sectionItemLeft}>
              <Icon name="weather-lightning-rainy" size={20} color={Colors.primaryAccent} />
              <Text style={styles.itemLabel}>Weather Alerts</Text>
            </View>
            <Switch
              value={weatherAlerts}
              onValueChange={setWeatherAlerts}
              trackColor={{ false: '#767577', true: Colors.primaryAccentLight }}
              thumbColor={weatherAlerts ? Colors.primaryAccent : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>MatsyaMitra v1.0.0</Text>
        <Text style={styles.appInfoSubtext}>
          Coastal Decision Support System
        </Text>
        <Text style={styles.appInfoSubtext}>Karnataka, India</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textOnDark,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15, 166, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryAccent,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textOnDark,
    marginBottom: 2,
  },
  profileSubtitle: {
    ...Typography.body,
    color: Colors.textSubtleOnDark,
    marginBottom: 6,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primaryAccent,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.chip,
    color: Colors.textSubtleOnDark,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSubtleOnDark,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sectionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerLight,
  },
  sectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  itemValue: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    maxWidth: 140,
    textAlign: 'right',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerLight,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  appInfoText: {
    ...Typography.body,
    color: Colors.textSubtleOnDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  appInfoSubtext: {
    ...Typography.chip,
    color: 'rgba(148, 163, 184, 0.6)',
  },
});

export default ProfileScreen;
