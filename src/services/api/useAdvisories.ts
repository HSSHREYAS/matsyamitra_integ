/**
 * Custom hook for fetching and managing INCOIS Advisories.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './client';
import { transformIncoisAdvisoriesToUI } from './transformers';
import type { IncoisAdvisoryResponse } from './types';
import type { Advisory } from '../../data/mockAdvisory';

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
      setRawAdvisories(data);
      const uiAdvisories = transformIncoisAdvisoriesToUI(data);
      setAdvisories(uiAdvisories);
      setIsOnline(true);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch advisories');
      setIsOnline(false);
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
