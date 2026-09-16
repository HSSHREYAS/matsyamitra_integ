/**
 * TypeScript API Response Types for MatsyaMitra Backend (FastAPI).
 */

export interface PfzStateResponse {
  score: number | null;
  category: string;
  confidence: number;
  observation_date: string;
  source: string;
  age_hours: number;
  status: 'CURRENT' | 'STALE' | 'MISSING' | string;
}

export interface RiskStateResponse {
  score: number | null;
  category: string;
  confidence: number;
  observation_timestamp: string;
  source: string;
  age_hours: number;
  status: 'CURRENT' | 'STALE' | 'MISSING' | string;
  wind_speed?: number | null;
  wave_height?: number | null;
}

export interface CurrentStateResponse {
  sampling_location_id: number;
  location_id: string;
  city_name: string;
  latitude: number;
  longitude: number;
  pfz: PfzStateResponse | null;
  risk: RiskStateResponse | null;
}

export interface IncoisAdvisoryResponse {
  id: number;
  advisory_date: string;
  sector_id: string;
  landing_center: string;
  city_name?: string | null;
  bearing_degrees: number | null;
  distance_km: number | null;
  depth_m: number | null;
  latitude: number;
  longitude: number;
  raw_text: string | null;
  nearest_sampling_location_id: number | null;
  distance_to_nearest_km: number | null;
}

export interface AlertResponse {
  id: string;
  severity: 'urgent' | 'caution' | 'info' | 'seasonal' | string;
  badge_label: string;
  title: string;
  body: string;
  source: string;
  timestamp: string;
  icon: string;
  category: 'weather' | 'advisory' | 'official' | 'news' | string;
  location_id: string | null;
  city_name?: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface HealthResponse {
  status: string;
  database_status: string;
  database_type: string | null;
  version: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isOnline: boolean;
}
