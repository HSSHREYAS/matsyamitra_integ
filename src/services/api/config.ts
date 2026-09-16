/**
 * MatsyaMitra API Configuration.
 */

import { Platform } from 'react-native';

const DEFAULT_DEV_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_CONFIG = {
  BASE_URL: DEFAULT_DEV_HOST,
  TIMEOUT_MS: 8000,
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    CURRENT_STATE: '/api/v1/current-state',
    CURRENT_STATE_BY_LOCATION: (locId: string) => `/api/v1/current-state/${encodeURIComponent(locId)}`,
    ADVISORIES: '/api/v1/advisories',
    ALERTS: '/api/v1/alerts',
  },
};

let currentBaseUrl = API_CONFIG.BASE_URL;

export function setApiBaseUrl(newUrl: string): void {
  currentBaseUrl = newUrl.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}
