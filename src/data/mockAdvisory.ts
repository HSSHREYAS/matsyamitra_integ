/**
 * Mock Advisory Data — Today's Fishing Advisory
 */

export type AdvisorySeverity = 'safe' | 'caution' | 'danger';

export interface Advisory {
  id: string;
  severity: AdvisorySeverity;
  badgeLabel: string;
  title: string;
  description: string;
  subLabel: string;
  subIcon?: string;
}

export const mockAdvisories: Advisory[] = [
  {
    id: 'adv-1',
    severity: 'safe',
    badgeLabel: 'SAFE ZONE',
    title: 'Mangalore Coast',
    description:
      'Favorable conditions near Mangalore coast. High catch potential identified for mackerel.',
    subLabel: 'OPTIMAL FOR SMALL CRAFT',
    subIcon: 'check-circle-outline',
  },
  {
    id: 'adv-2',
    severity: 'caution',
    badgeLabel: 'CAUTION ZONE',
    title: 'Karwar Coast',
    description:
      'Mild swell predicted near Karwar. Caution advised for vessels under 10 meters.',
    subLabel: 'MONITORING SWELL / DEPTH',
    subIcon: 'alert-outline',
  },
];

export default mockAdvisories;
