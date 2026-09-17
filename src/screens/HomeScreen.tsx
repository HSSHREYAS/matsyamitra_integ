/**
 * HomeScreen — Main dashboard with full-bleed ocean sunrise hero header,
 * live GEE satellite telemetry, INCOIS advisories, view on map, and 2x2 quick actions.
 */

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TopBar from '../components/home/TopBar';
import LocationSelectorModal from '../components/home/LocationSelectorModal';
import WeatherCard from '../components/home/WeatherCard';
import FishingAdvisory from '../components/home/FishingAdvisory';
import QuickActions from '../components/home/QuickActions';
import CatchLogModal from '../components/home/CatchLogModal';
import DistressModal from '../components/home/DistressModal';
import EquipmentChecklistModal from '../components/home/EquipmentChecklistModal';
import FleetTrackingModal from '../components/home/FleetTrackingModal';
import {
  useCurrentState,
  useAdvisories,
  transformCurrentStateToWeather,
  getCanonicalCityName,
} from '../services/api';
import { useLanguage } from '../i18n';

interface HomeScreenProps {
  navigation?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<'catch' | 'distress' | 'equipment' | 'fleet' | null>(null);

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
    refresh: refreshAdvisories,
  } = useAdvisories();

  const isRefreshing = isStateLoading || isAdvLoading;

  const handleRefresh = async () => {
    await Promise.all([refreshCurrentState(), refreshAdvisories()]);
  };

  const handleLocationPress = () => {
    setIsLocationModalVisible(true);
  };

  const handleSelectLocation = (locationId: string) => {
    selectLocation(locationId);
  };

  // Derive weather data: strictly live backend current state with GEE observations
  const weatherData = useMemo(() => {
    if (selectedState && (selectedState.risk || selectedState.pfz)) {
      return transformCurrentStateToWeather(selectedState);
    }
    return null;
  }, [selectedState]);

  // Derive advisories: strictly live INCOIS bulletins
  const activeAdvisories = useMemo(() => {
    if (liveAdvisories && liveAdvisories.length > 0) {
      return liveAdvisories;
    }
    return [];
  }, [liveAdvisories]);

  const currentCityName = selectedState
    ? getCanonicalCityName(selectedState.location_id, selectedState.city_name)
    : 'Karwar';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0284C7"
            colors={['#0284C7']}
          />
        }>
        {/* Full-Bleed Ocean Sunrise Hero Header */}
        <ImageBackground
          source={require('../assets/images/ocean_hero_bg.jpg')}
          style={styles.heroBackground}
          imageStyle={styles.heroImage}
          resizeMode="cover">
          <View style={styles.heroContent}>
            {/* Top Bar with brand icon, dual-title, slogan, language capsule & notification bell */}
            <TopBar
              onNotificationPress={() => navigation?.navigate('Alerts')}
              unreadCount={activeAdvisories.length}
            />

            {/* Location Selector Capsule Pill */}
            <TouchableOpacity
              style={styles.locationPill}
              onPress={handleLocationPress}
              activeOpacity={0.85}>
              <Icon name="map-marker" size={16} color="#0A2540" />
              <Text style={styles.locationText}>{currentCityName}</Text>
              <Icon name="chevron-down" size={18} color="#0A2540" />
            </TouchableOpacity>

            {/* Personalized Greeting on Left */}
            <View style={styles.greetingSection}>
              <Text style={styles.greetingTitle}>
                {t('greeting_namaskara')}{'\n'}{t('user_rameshanna')}
              </Text>
              <Text style={styles.greetingSubtitle}>
                {t('check_sea_conditions')}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Current Conditions Weather Card (Overlapping Hero) */}
        <View style={styles.weatherCardWrapper}>
          {weatherData ? (
            <WeatherCard weather={weatherData} />
          ) : (
            <View style={styles.unavailableCard}>
              <Icon name="cloud-off-outline" size={36} color="#94A3B8" />
              <Text style={styles.unavailableTitle}>{t('offline_cached')}</Text>
              <Text style={styles.unavailableSubtitle}>
                {isStateLoading ? t('connecting') : 'Connecting to live GEE satellite telemetry...'}
              </Text>
            </View>
          )}
        </View>

        {/* Today's Fishing Advisory */}
        {activeAdvisories.length > 0 ? (
          <FishingAdvisory
            advisories={activeAdvisories}
            onViewMap={() => navigation?.navigate('Map')}
            onViewAll={() => navigation?.navigate('Alerts')}
          />
        ) : (
          <View style={styles.advisoryUnavailableCard}>
            <Icon name="information-outline" size={24} color="#0D9488" />
            <Text style={styles.advisoryUnavailableText}>
              {isAdvLoading ? t('advisory_loading') : t('advisory_safe_notice')}
            </Text>
          </View>
        )}

        {/* Full-Width "View on Map" Royal Blue Button */}
        <View style={styles.mapButtonContainer}>
          <TouchableOpacity
            style={styles.viewOnMapButton}
            onPress={() => navigation?.navigate('Map')}
            activeOpacity={0.85}>
            <Icon name="map-outline" size={20} color="#FFFFFF" />
            <Text style={styles.viewOnMapText}>{t('view_on_map')}</Text>
          </TouchableOpacity>
        </View>

        {/* 2×2 Quick Actions Grid (Catch Logs, Distress Alerts, Fleet Tracking, Equipment) */}
        <QuickActions
          onActionPress={(actionId) => {
            setActiveModal(actionId);
          }}
        />
      </ScrollView>

      {/* Coastal Location Selector Modal */}
      <LocationSelectorModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        onSelectLocation={handleSelectLocation}
        selectedLocationId={selectedState?.location_id}
        states={states}
      />

      {/* Catch Log Modal */}
      <CatchLogModal
        visible={activeModal === 'catch'}
        onClose={() => setActiveModal(null)}
        currentPort={currentCityName}
      />

      {/* Distress / SOS Modal */}
      <DistressModal
        visible={activeModal === 'distress'}
        onClose={() => setActiveModal(null)}
        currentPort={currentCityName}
        latitude={selectedState?.latitude}
        longitude={selectedState?.longitude}
      />

      {/* Equipment Checklist Modal */}
      <EquipmentChecklistModal
        visible={activeModal === 'equipment'}
        onClose={() => setActiveModal(null)}
        currentPort={currentCityName}
      />

      {/* Fleet Tracking Modal */}
      <FleetTrackingModal
        visible={activeModal === 'fleet'}
        onClose={() => setActiveModal(null)}
        currentPort={currentCityName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  heroBackground: {
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A2540',
  },
  greetingSection: {
    marginTop: 10,
    maxWidth: '75%',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 3,
    lineHeight: 17,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  weatherCardWrapper: {
    marginTop: -16,
  },
  mapButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  viewOnMapButton: {
    backgroundColor: '#0284C7',
    height: 48,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  viewOnMapText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  unavailableCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A2540',
    marginTop: 8,
    marginBottom: 4,
  },
  unavailableSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  advisoryUnavailableCard: {
    marginHorizontal: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 12,
  },
  advisoryUnavailableText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
