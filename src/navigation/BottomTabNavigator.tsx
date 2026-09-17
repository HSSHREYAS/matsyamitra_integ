/**
 * BottomTabNavigator — 4-tab navigation: Home, Map, Alerts, Profile
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Layout } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useLanguage, type TranslationKey } from '../i18n';

const Tab = createBottomTabNavigator();

interface TabConfigItem {
  name: string;
  labelKey: TranslationKey;
  component: React.ComponentType<any>;
  icon: string;
  iconOutline: string;
}

const tabConfig: TabConfigItem[] = [
  { name: 'Home', labelKey: 'tab_home', component: HomeScreen, icon: 'home', iconOutline: 'home-outline' },
  { name: 'Map', labelKey: 'tab_map', component: MapScreen, icon: 'map', iconOutline: 'map-outline' },
  { name: 'Alerts', labelKey: 'tab_alerts', component: AlertsScreen, icon: 'bell', iconOutline: 'bell-outline' },
  { name: 'Profile', labelKey: 'tab_profile', component: ProfileScreen, icon: 'account', iconOutline: 'account-outline' },
];

const BottomTabNavigator: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primaryAccent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      {tabConfig.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: t(tab.labelKey),
            tabBarBadge: tab.name === 'Alerts' ? 3 : undefined,
            tabBarBadgeStyle: styles.badge,
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : styles.iconContainer}>
                <Icon
                  name={focused ? tab.icon : tab.iconOutline}
                  size={22}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    height: Layout.bottomTabHeight + 8,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabLabel: {
    ...Typography.chip,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  iconContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(15, 166, 136, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  badge: {
    backgroundColor: Colors.danger,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    lineHeight: 15,
  },
});

export default BottomTabNavigator;

