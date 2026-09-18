/**
 * Custom hook for fetching and managing Current Environmental State.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import type { CurrentStateResponse } from './types';

const CACHE_KEY_STATES = '@matsyamitra_cached_states';

export interface UseCurrentStateReturn {
  states: CurrentStateResponse[];
  selectedState: CurrentStateResponse | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  selectLocation: (locationId: string) => void;
}

export function useCurrentState(initialLocationId: string = 'KARN_001'): UseCurrentStateReturn {
  const [states, setStates] = useState<CurrentStateResponse[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocationId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCurrentStates();
      if (data && data.length > 0) {
        setStates(data);
        setIsOnline(true);
        setError(null);
        AsyncStorage.setItem(CACHE_KEY_STATES, JSON.stringify(data)).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to MatsyaMitra API');
      setIsOnline(false);

      // Restore from offline cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY_STATES);
        if (cached) {
          const cachedStates: CurrentStateResponse[] = JSON.parse(cached);
          if (cachedStates && cachedStates.length > 0) {
            setStates(cachedStates);
          }
        }
      } catch {
        // ignore cache read failure
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Poll FastAPI every 10 minutes while component is mounted
    const intervalId = setInterval(() => {
      fetchData();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData]);

  const selectLocation = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
  }, []);

  const selectedState =
    states.find((s) => s.location_id.toLowerCase() === selectedLocationId.toLowerCase()) ||
    (states.length > 0 ? states[0] : null);

  return {
    states,
    selectedState,
    isLoading,
    error,
    isOnline,
    refresh: fetchData,
    selectLocation,
  };
}
