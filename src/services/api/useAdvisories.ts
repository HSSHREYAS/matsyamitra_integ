/**
 * Custom hook for fetching and managing INCOIS Advisories.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { transformIncoisAdvisoriesToUI } from './transformers';
import type { IncoisAdvisoryResponse } from './types';
import type { Advisory } from '../../data/mockAdvisory';

const CACHE_KEY_ADVISORIES = '@matsyamitra_cached_advisories';

export interface UseAdvisoriesReturn {
  advisories: Advisory[];
  rawAdvisories: IncoisAdvisoryResponse[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
}

export function useAdvisories(landingFilter?: string): UseAdvisoriesReturn {
  const [rawAdvisories, setRawAdvisories] = useState<IncoisAdvisoryResponse[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdvisories(landingFilter);
      if (data && data.length > 0) {
        setRawAdvisories(data);
        const uiAdvisories = transformIncoisAdvisoriesToUI(data);
        setAdvisories(uiAdvisories);
        setIsOnline(true);
        setError(null);
        // Persist latest advisories for offline offshore use
        AsyncStorage.setItem(CACHE_KEY_ADVISORIES, JSON.stringify(data)).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch advisories');
      setIsOnline(false);

      // Restore from offline cache when out of cell reception range
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY_ADVISORIES);
        if (cached) {
          const cachedData: IncoisAdvisoryResponse[] = JSON.parse(cached);
          if (cachedData && cachedData.length > 0) {
            setRawAdvisories(cachedData);
            setAdvisories(transformIncoisAdvisoriesToUI(cachedData));
          }
        }
      } catch {
        // ignore cache read failure
      }
    } finally {
      setIsLoading(false);
    }
  }, [landingFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    advisories,
    rawAdvisories,
    isLoading,
    error,
    isOnline,
    refresh: fetchData,
  };
}
