/**
 * MatsyaMitra API HTTP Client.
 */

import { API_CONFIG, getApiBaseUrl } from './config';
import type {
  AlertResponse,
  CurrentStateResponse,
  HealthResponse,
  IncoisAdvisoryResponse,
} from './types';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = API_CONFIG.TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal as any,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson: any = await response.json();
        if (errorJson?.detail) {
          errorMessage = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fall back to status text if body not json
      }
      throw new ApiError(errorMessage, response.status);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs / 1000}s to ${endpoint}`);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error?.message || 'Network connection failed. Backend might be unreachable.');
  }
}

export const apiClient = {
  /** Health check */
  getHealth(): Promise<HealthResponse> {
    return fetchWithTimeout<HealthResponse>(API_CONFIG.ENDPOINTS.HEALTH);
  },

  /** Get all 25 canonical sampling locations current state */
  getCurrentStates(): Promise<CurrentStateResponse[]> {
    return fetchWithTimeout<CurrentStateResponse[]>(API_CONFIG.ENDPOINTS.CURRENT_STATE);
  },

  /** Get current state for a single canonical location */
  getCurrentStateByLocation(locationId: string): Promise<CurrentStateResponse> {
    return fetchWithTimeout<CurrentStateResponse>(API_CONFIG.ENDPOINTS.CURRENT_STATE_BY_LOCATION(locationId));
  },

  /** Get INCOIS advisories with optional landing center filter */
  getAdvisories(landing?: string): Promise<IncoisAdvisoryResponse[]> {
    const query = landing ? `?landing=${encodeURIComponent(landing)}` : '';
    return fetchWithTimeout<IncoisAdvisoryResponse[]>(`${API_CONFIG.ENDPOINTS.ADVISORIES}${query}`);
  },

  /** Get live aggregated alerts */
  getAlerts(): Promise<AlertResponse[]> {
    return fetchWithTimeout<AlertResponse[]>(API_CONFIG.ENDPOINTS.ALERTS);
  },
};
