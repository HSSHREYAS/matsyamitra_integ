"""Pydantic schemas for the MatsyaMitra REST API.

These schemas accurately represent the outputs from the current_state,
incois, and risk persistence layers.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Application health status ('ok' or 'degraded')")
    database_status: str = Field(..., description="'connected' or 'disconnected'")
    database_type: Optional[str] = Field(None, description="Database dialect in use")
    version: str = Field("1.0.0", description="API version")
    timestamp: datetime = Field(..., description="Current server UTC timestamp")


class PfzStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: Optional[float] = Field(None, description="PFZ suitability score (0-10)")
    category: str = Field(..., description="Category: Highly Favourable, Favourable, Moderate, Low, Very Low, Unknown")
    confidence: float = Field(..., description="Statistical confidence score (0-1)")
    observation_date: date = Field(..., description="Observation date (UTC)")
    source: str = Field(..., description="Data source identifier (e.g., 'gee')")
    age_hours: float = Field(..., description="Data age in hours from midnight UTC")
    status: str = Field(..., description="Freshness status: CURRENT, STALE, MISSING")
    sst: Optional[float] = Field(None, description="GEE Sea Surface Temperature in °C")
    chlorophyll: Optional[float] = Field(None, description="GEE Chlorophyll-a in mg/m³")


class RiskStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: Optional[float] = Field(None, description="Operational marine risk score (0-10)")
    category: str = Field(..., description="Category: Safe, Low Risk, Moderate Risk, High Risk, Extreme Risk, Unknown")
    confidence: float = Field(..., description="Statistical confidence score (0-1)")
    observation_timestamp: datetime = Field(..., description="Observation timestamp with timezone")
    source: str = Field(..., description="Data source identifier (e.g., 'open-meteo')")
    age_hours: float = Field(..., description="Data age in hours from observation timestamp")
    status: str = Field(..., description="Freshness status: CURRENT, STALE, MISSING")
    wind_speed: Optional[float] = Field(None, description="Wind speed measurement in m/s")
    wave_height: Optional[float] = Field(None, description="Significant wave height measurement in meters")


class CurrentStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sampling_location_id: int = Field(..., description="Database integer ID of the sampling location")
    location_id: str = Field(..., description="Canonical location code (e.g. 'KARN_001')")
    city_name: str = Field(..., description="Human-readable coastal city/location name (e.g. 'Karwar')")
    latitude: float = Field(..., description="Canonical latitude")
    longitude: float = Field(..., description="Canonical longitude")
    pfz: Optional[PfzStateOut] = Field(None, description="Latest PFZ state, or None if no observation exists")
    risk: Optional[RiskStateOut] = Field(None, description="Latest Risk state, or None if no observation exists")


class IncoisAdvisoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    advisory_date: date
    sector_id: str
    landing_center: str
    city_name: Optional[str] = None
    bearing_degrees: Optional[float] = None
    distance_km: Optional[float] = None
    depth_m: Optional[float] = None
    latitude: float
    longitude: float
    raw_text: Optional[str] = None
    nearest_sampling_location_id: Optional[int] = None
    distance_to_nearest_km: Optional[float] = None


class AlertOut(BaseModel):
    id: str = Field(..., description="Unique alert identifier")
    severity: str = Field(..., description="'urgent' | 'caution' | 'info' | 'seasonal'")
    badge_label: str = Field(..., description="UI badge display text")
    title: str = Field(..., description="Alert headline")
    body: str = Field(..., description="Detailed alert message")
    source: str = Field(..., description="Origin source (e.g., 'Open-Meteo Risk', 'INCOIS PFZ')")
    timestamp: str = Field(..., description="Human readable or relative timestamp")
    icon: str = Field(..., description="Material Community icon name")
    category: str = Field(..., description="'weather' | 'advisory' | 'official' | 'news'")
    location_id: Optional[str] = Field(None, description="Associated canonical location ID if applicable")
    city_name: Optional[str] = Field(None, description="Associated coastal city name if applicable")
    latitude: Optional[float] = Field(None, description="Latitude for geo-pinned alerts")
    longitude: Optional[float] = Field(None, description="Longitude for geo-pinned alerts")
