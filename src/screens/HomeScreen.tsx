/**
 * HomeScreen — Main dashboard with live weather telemetry, INCOIS advisories, and quick actions.
 * Connected exclusively to live MatsyaMitra REST API.
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, StatusBar, RefreshControl, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme';
import TopBar from '../components/home/TopBar';
import LocationRow from '../components/home/LocationRow';
import LocationSelectorModal from '../components/home/LocationSelectorModal';
import WeatherCard from '../components/home/WeatherCard';
import FishingAdvisory from '../components/home/FishingAdvisory';
import QuickActions from '../components/home/QuickActions';
import {
  useCurrentState,
  useAdvisories,
  transformCurrentStateToWeather,
  getCanonicalCityName,
} from '../services/api';

const HomeScreen: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'kn'>('en');
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);

  // Live backend hooks
  const {
    states,
    selectedState,
    isLoading: isStateLoading,
    isOnline: isStateOnline,
    refresh: refreshCurrentState,
    selectLocation,
  } = useCurrentState('KARN_001');

  const {
    advisories: liveAdvisories,
    isLoading: isAdvLoading,
    isOnline: isAdvOnline,
    refresh: refreshAdvisories,
  } = useAdvisories();

  const isRefreshing = isStateLoading || isAdvLoading;

  const handleRefresh = async () => {
    await Promise.all([refreshCurrentState(), refreshAdvisories()]);
  };

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'en' ? 'kn' : 'en'));
  };

  // Open location selector modal
  const handleLocationPress = () => {
    setIsLocationModalVisible(true);
  };

  const handleSelectLocation = (locationId: string) => {
    selectLocation(locationId);
  };

  // Derive weather data: strictly live backend current state (no mock fallback)
  const weatherData = useMemo(() => {
    if (selectedState && (selectedState.risk || selectedState.pfz)) {
      return transformCurrentStateToWeather(selectedState);
    }
    return null;
  }, [selectedState]);

  // Derive advisories: strictly live INCOIS bulletins (no mock fallback)
  const activeAdvisories = useMemo(() => {
    if (liveAdvisories && liveAdvisories.length > 0) {
      return liveAdvisories;
    }
    return [];
  }, [liveAdvisories]);

  const currentLocationLabel = selectedState
    ? `${getCanonicalCityName(selectedState.location_id, selectedState.city_name)} (${selectedState.latitude.toFixed(2)}°N, ${selectedState.longitude.toFixed(2)}°E)`
    : states.length > 0
    ? `${getCanonicalCityName(states[0].location_id, states[0].city_name)} (${states[0].latitude.toFixed(2)}°N, ${states[0].longitude.toFixed(2)}°E)`
    : 'Karnataka Coast (Connecting...)';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primaryAccent}
            colors={[Colors.primaryAccent]}
          />
        }>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primaryBackground} />

        {/* Top Bar */}
        <TopBar
          language={language}
          onLanguageToggle={handleLanguageToggle}
          onMenuPress={() => {}}
        />

        {/* Connectivity Status Banner */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isStateOnline ? Colors.safe : Colors.textSubtleOnDark },
            ]}
          />
          <Text style={styles.statusText}>
            {isStateOnline ? 'LIVE TELEMETRY CONNECTED' : 'OFFLINE / LIVE DATA UNAVAILABLE'}
          </Text>
        </View>

        {/* Location */}
        <LocationRow location={currentLocationLabel} onPress={handleLocationPress} />

        {/* Hero Weather Card or Offline State */}
        {weatherData ? (
          <WeatherCard weather={weatherData} />
        ) : (
          <View style={styles.unavailableCard}>
            <Icon name="cloud-off-outline" size={36} color={Colors.textSubtleOnDark} />
            <Text style={styles.unavailableTitle}>Live Telemetry Unavailable</Text>
            <Text style={styles.unavailableSubtitle}>
              {isStateLoading
                ? 'Connecting to MatsyaMitra API server...'
                : 'Unable to reach backend. Real-time wind, wave, and ocean observations will appear when connected.'}
            </Text>
          </View>
        )}

        {/* Fishing Advisory or Unavailable State */}
        {activeAdvisories.length > 0 ? (
          <FishingAdvisory
            advisories={activeAdvisories}
            onViewMap={() => {}}
          />
        ) : (
          <View style={styles.advisoryUnavailableContainer}>
            <View style={styles.advisoryHeader}>
              <Text style={styles.sectionTitle}>Today's Fishing Advisory</Text>
            </View>
            <View style={styles.advisoryUnavailableCard}>
              <Icon name="information-outline" size={24} color={Colors.textSubtleOnDark} />
              <Text style={styles.advisoryUnavailableText}>
                {isAdvLoading
                  ? 'Loading INCOIS advisories...'
                  : 'No active INCOIS advisories currently available. Live bulletins will appear when published.'}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <QuickActions />
      </ScrollView>

      {/* Coastal Location Selector Modal */}
      <LocationSelectorModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        onSelectLocation={handleSelectLocation}
        selectedLocationId={selectedState?.location_id}
        states={states}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  contentContainer: {
    paddingBottom: Spacing.massive + 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    letterSpacing: 0.5,
  },
  unavailableCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.cardHeavy,
  },
  unavailableTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textOnDark,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  unavailableSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSubtleOnDark,
    textAlign: 'center',
    lineHeight: 18,
  },
  advisoryUnavailableContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  advisoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    color: Colors.textOnDark,
  },
  advisoryUnavailableCard: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  advisoryUnavailableText: {
    ...Typography.bodySmall,
    color: Colors.textSubtleOnDark,
    flex: 1,
    lineHeight: 18,
  },
});

export default HomeScreen;

