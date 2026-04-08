/**
 * Mock Weather Data — Karnataka Coast
 */

export interface WeatherData {
  temperature: number;
  condition: string;
  conditionIcon: string;
  windSpeed: number;
  windUnit: string;
  waveHeight: number;
  waveUnit: string;
  humidity: number;
  seaTemp: number;
  chlorophyll: number;
  chlorophyllUnit: string;
  updatedAgo: string;
  location: string;
}

export const mockWeather: WeatherData = {
  temperature: 29,
  condition: 'CLEAR SKIES',
  conditionIcon: 'weather-sunny',
  windSpeed: 12,
  windUnit: 'km/h',
  waveHeight: 1.2,
  waveUnit: 'm',
  humidity: 78,
  seaTemp: 28,
  chlorophyll: 0.4,
  chlorophyllUnit: 'mg/m³',
  updatedAgo: 'UPDATED 30 MINS AGO',
  location: 'Mangalore Coast',
};

export const locations = [
  'Mangalore Coast',
  'Karwar Coast',
  'Udupi Coast',
  'Gokarna Coast',
  'Bhatkal Coast',
];

export default mockWeather;
