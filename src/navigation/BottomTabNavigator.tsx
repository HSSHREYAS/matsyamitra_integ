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
        tabBarInactiveTintColor: Colors.textSubtleOnDark,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      {tabConfig.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: t(tab.labelKey),
            tabBarIcon: ({ focused, color, size }) => (
              <View style={focused ? styles.activeIconContainer : undefined}>
                <Icon
                  name={focused ? tab.icon : tab.iconOutline}
                  size={24}
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
    backgroundColor: Colors.primaryBackground,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    height: Layout.bottomTabHeight + 10,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabLabel: {
    ...Typography.chip,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(15, 166, 136, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

export default BottomTabNavigator;
