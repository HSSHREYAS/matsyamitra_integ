/**
 * Catch Log Storage Service — Local offline persistence for fish catches.
 * Stored locally on-device using AsyncStorage so fishermen can record
 * and review catch history even in deep sea dead zones.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CatchRecord {
  id: string;
  timestamp: string; // ISO string
  dateDisplay: string;
  species: string;
  weightKg: number;
  ratePerKg?: number;
  totalEstimatedRevenue?: number;
  port: string;
  notes?: string;
}

const CATCH_LOG_STORAGE_KEY = '@matsyamitra_catch_logs';

export async function getCatchLogs(): Promise<CatchRecord[]> {
  try {
    const json = await AsyncStorage.getItem(CATCH_LOG_STORAGE_KEY);
    if (!json) {
      return [];
    }
    const records = JSON.parse(json);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error('Failed to load catch logs from storage:', error);
    return [];
  }
}

export async function saveCatchRecord(
  record: Omit<CatchRecord, 'id' | 'timestamp' | 'dateDisplay' | 'totalEstimatedRevenue'>,
): Promise<CatchRecord[]> {
  try {
    const existing = await getCatchLogs();
    const now = new Date();
    const id = `CATCH_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalEstimatedRevenue =
      record.ratePerKg && record.ratePerKg > 0 ? record.ratePerKg * record.weightKg : undefined;

    const newRecord: CatchRecord = {
      ...record,
      id,
      timestamp: now.toISOString(),
      dateDisplay: now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      totalEstimatedRevenue,
    };

    const updated = [newRecord, ...existing];
    await AsyncStorage.setItem(CATCH_LOG_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save catch record:', error);
    throw error;
  }
}

export async function deleteCatchRecord(id: string): Promise<CatchRecord[]> {
  try {
    const existing = await getCatchLogs();
    const updated = existing.filter((item) => item.id !== id);
    await AsyncStorage.setItem(CATCH_LOG_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to delete catch record:', error);
    throw error;
  }
}

export async function clearAllCatchLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CATCH_LOG_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear catch logs:', error);
  }
}
