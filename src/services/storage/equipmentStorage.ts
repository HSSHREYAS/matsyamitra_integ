/**
 * Equipment Checklist Storage Service — Local offline persistence for vessel safety checklist.
 * Ensures critical safety gear is inspected prior to casting off from Karnataka ports.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'safety' | 'comms' | 'engine' | 'navigation';
  checked: boolean;
  required: boolean;
  description: string;
}

const EQUIPMENT_STORAGE_KEY = '@matsyamitra_equipment_state';

export const DEFAULT_EQUIPMENT_ITEMS: ChecklistItem[] = [
  {
    id: 'life_jackets',
    label: 'Life Jackets (ISI/SOLAS)',
    category: 'safety',
    checked: true,
    required: true,
    description: '1 certified jacket per crew member on board',
  },
  {
    id: 'vhf_radio',
    label: 'VHF Marine Radio',
    category: 'comms',
    checked: true,
    required: true,
    description: 'Tuned and tested on Channel 16 (156.8 MHz)',
  },
  {
    id: 'gps_device',
    label: 'GPS / Navigation Device',
    category: 'navigation',
    checked: true,
    required: true,
    description: 'Loaded with coastal waypoints and battery charged',
  },
  {
    id: 'distress_flares',
    label: 'Visual Distress Flares / Smoke',
    category: 'safety',
    checked: false,
    required: true,
    description: 'Red handheld flares & orange smoke signals valid',
  },
  {
    id: 'extra_fuel_water',
    label: 'Reserve Fuel & Fresh Water',
    category: 'engine',
    checked: false,
    required: true,
    description: 'At least 25% reserve fuel + 5L drinking water/person',
  },
  {
    id: 'first_aid',
    label: 'First Aid Medical Kit',
    category: 'safety',
    checked: true,
    required: false,
    description: 'Bandages, antiseptic, burn cream, motion sickness tabs',
  },
  {
    id: 'anchor_bilge',
    label: 'Secondary Anchor & Manual Bilge Pump',
    category: 'engine',
    checked: false,
    required: false,
    description: 'Emergency anchoring and bailing readiness',
  },
];

export async function getEquipmentChecklist(): Promise<ChecklistItem[]> {
  try {
    const json = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    if (!json) {
      return DEFAULT_EQUIPMENT_ITEMS;
    }
    const saved = JSON.parse(json);
    if (!Array.isArray(saved)) {
      return DEFAULT_EQUIPMENT_ITEMS;
    }

    // Merge saved state with defaults in case items were added
    return DEFAULT_EQUIPMENT_ITEMS.map((def) => {
      const found = saved.find((s) => s.id === def.id);
      return found ? { ...def, checked: found.checked } : def;
    });
  } catch (error) {
    console.error('Failed to load equipment checklist:', error);
    return DEFAULT_EQUIPMENT_ITEMS;
  }
}

export async function toggleEquipmentItem(id: string): Promise<ChecklistItem[]> {
  try {
    const items = await getEquipmentChecklist();
    const updated = items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to toggle equipment item:', error);
    throw error;
  }
}

export async function resetEquipmentChecklist(): Promise<ChecklistItem[]> {
  try {
    const reset = DEFAULT_EQUIPMENT_ITEMS.map((i) => ({ ...i, checked: false }));
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(reset));
    return reset;
  } catch (error) {
    console.error('Failed to reset equipment checklist:', error);
    throw error;
  }
}
