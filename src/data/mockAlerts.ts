/**
 * Mock Alert Data — Alerts & Notices Screen
 */

export type AlertSeverity = 'urgent' | 'caution' | 'info' | 'seasonal';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  badgeLabel: string;
  title: string;
  body: string;
  source: string;
  timestamp: string;
  icon: string;
  category: 'official' | 'weather' | 'advisory' | 'news';
}

export const mockAlerts: AlertItem[] = [
  {
    id: 'alert-1',
    severity: 'urgent',
    badgeLabel: 'URGENT',
    title: 'Rough Sea Warning: Cyclonic Storm Over Arabian Sea',
    body: 'Fishermen are advised not to venture into the deep sea areas until further notice.',
    source: 'IMD Weather',
    timestamp: '2 hours ago',
    icon: 'alert-circle',
    category: 'weather',
  },
  {
    id: 'alert-2',
    severity: 'caution',
    badgeLabel: 'CAUTION',
    title: 'Potential Fishing Zone (PFZ) Update: Karwar Coast',
    body: 'High chlorophyll concentrations detected near Karwar. Expected high catch potential.',
    source: 'INCOIS',
    timestamp: '4 hours ago',
    icon: 'fish',
    category: 'advisory',
  },
  {
    id: 'alert-3',
    severity: 'info',
    badgeLabel: 'INFORMATION',
    title: 'New Diesel Subsidy Scheme Released for 2024',
    body: "Apply for the state government's updated fuel subsidy program via the official portal.",
    source: 'Karnataka Fisheries Dept',
    timestamp: 'Yesterday',
    icon: 'information',
    category: 'official',
  },
  {
    id: 'alert-4',
    severity: 'seasonal',
    badgeLabel: 'SEASONAL GUIDELINE',
    title: 'Monsoon Trawling Ban Phase II',
    body: 'Detailed guidelines for the upcoming 61-day uniform ban period on the West Coast.',
    source: 'Govt. of India',
    timestamp: 'This Week',
    icon: 'calendar-clock',
    category: 'official',
  },
];

export default mockAlerts;
