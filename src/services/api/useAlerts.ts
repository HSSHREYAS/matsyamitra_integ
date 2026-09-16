/**
 * Custom hook for fetching live alerts from backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './client';
import { transformAlertsToUI } from './transformers';
import type { AlertResponse } from './types';
import type { AlertItem } from '../../data/mockAlerts';

export interface UseAlertsReturn {
  alerts: AlertItem[];
  rawAlerts: AlertResponse[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
}

export function useAlerts(): UseAlertsReturn {
  const [rawAlerts, setRawAlerts] = useState<AlertResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAlerts();
      setRawAlerts(data);
      const uiAlerts = transformAlertsToUI(data);
      setAlerts(uiAlerts);
      setIsOnline(true);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch alerts');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    alerts,
    rawAlerts,
    isLoading,
    error,
    isOnline,
    refresh: fetchData,
  };
}
