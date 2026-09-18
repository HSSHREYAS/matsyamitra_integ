/**
 * User Profile & Vessel Storage Service — Offline persistence for fisher settings.
 * Persists vessel information, default home port, and user preferences on-device
 * using AsyncStorage so the application automatically loads the fisherman's port
 * and boat setup on launch even without internet connectivity.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type VesselType =
  | 'Traditional Canoe'
  | 'Motorized Craft (OBM)'
  | 'Mechanized Trawler'
  | 'Purse Seiner'
  | 'Gillnetter';

export interface UserProfile {
  fisherName: string;
  fisherPhone: string;
  vesselName: string;
  registrationNumber: string;
  vesselType: VesselType;
  defaultPortId: string;
  defaultPortName: string;
  experienceYears: number;
  fisherId: string;
  tripsCount: number;
  pushNotifications: boolean;
  weatherAlerts: boolean;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  fisherName: 'Ramesh Kumar',
  fisherPhone: '+91 98450 12345',
  vesselName: 'Sagar Rani',
  registrationNumber: 'KA-MNG-2024-1856',
  vesselType: 'Mechanized Trawler',
  defaultPortId: 'KARN_001',
  defaultPortName: 'Karwar',
  experienceYears: 12,
  fisherId: 'KA-IND-F-8842',
  tripsCount: 156,
  pushNotifications: true,
  weatherAlerts: true,
};

const USER_PROFILE_STORAGE_KEY = '@matsyamitra_user_profile';

/**
 * Loads the saved user profile from local storage.
 * Falls back to DEFAULT_USER_PROFILE if not yet configured.
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!json) {
      return { ...DEFAULT_USER_PROFILE };
    }
    const parsed = JSON.parse(json);
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to load user profile from storage:', error);
    return { ...DEFAULT_USER_PROFILE };
  }
}

/**
 * Updates and persists partial or complete profile fields to local storage.
 */
export async function saveUserProfile(
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  try {
    const current = await getUserProfile();
    const updated: UserProfile = {
      ...current,
      ...updates,
    };
    await AsyncStorage.setItem(
      USER_PROFILE_STORAGE_KEY,
      JSON.stringify(updated),
    );
    return updated;
  } catch (error) {
    console.error('Failed to save user profile to storage:', error);
    throw error;
  }
}

/**
 * Resets user profile back to defaults.
 */
export async function resetUserProfile(): Promise<UserProfile> {
  try {
    await AsyncStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    return { ...DEFAULT_USER_PROFILE };
  } catch (error) {
    console.error('Failed to reset user profile:', error);
    return { ...DEFAULT_USER_PROFILE };
  }
}
