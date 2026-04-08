/**
 * HomeScreen — Main dashboard with weather, advisory, and quick actions
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, StatusBar } from 'react-native';
import { Colors, Spacing } from '../theme';
import TopBar from '../components/home/TopBar';
import LocationRow from '../components/home/LocationRow';
import WeatherCard from '../components/home/WeatherCard';
import FishingAdvisory from '../components/home/FishingAdvisory';
import QuickActions from '../components/home/QuickActions';
import { mockWeather } from '../data/mockWeather';
import { mockAdvisories } from '../data/mockAdvisory';

const HomeScreen: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'kn'>('en');
  const [location, setLocation] = useState('Mangalore Coast');

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'en' ? 'kn' : 'en'));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryBackground} />

      {/* Top Bar */}
      <TopBar
        language={language}
        onLanguageToggle={handleLanguageToggle}
        onMenuPress={() => {}}
      />

      {/* Location */}
      <LocationRow location={location} onPress={() => {}} />

      {/* Hero Weather Card */}
      <WeatherCard weather={mockWeather} />

      {/* Fishing Advisory */}
      <FishingAdvisory
        advisories={mockAdvisories}
        onViewMap={() => {}}
      />

      {/* Quick Actions */}
      <QuickActions />
    </ScrollView>
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
});

export default HomeScreen;
