/**
 * FishingAdvisory — Mint card displaying live INCOIS Potential Fishing Zone advisory.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Advisory } from '../../data/mockAdvisory';
import { useLanguage } from '../../i18n';

interface FishingAdvisoryProps {
  advisories: Advisory[];
  onViewMap?: () => void;
  onViewAll?: () => void;
}

const FishingAdvisory: React.FC<FishingAdvisoryProps> = ({
  advisories,
  onViewMap,
  onViewAll,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayAdvisories = isExpanded ? advisories : advisories.slice(0, 1);
  const primaryAdvisory = advisories[0];

  return (
    <View style={styles.container}>
      {/* Header Row: Today's Advisory + View All link */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t('today_advisory')}</Text>
        <TouchableOpacity
          onPress={onViewAll || (() => setIsExpanded(!isExpanded))}
          activeOpacity={0.7}>
          <Text style={styles.viewAllLink}>
            {isExpanded ? `${t('advisory_show_less')} ↑` : `${t('view_all')} →`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Advisory Card(s) */}
      {displayAdvisories.map((advisory, idx) => {
        const isHonnavar = (advisory.title || '').toLowerCase().includes('honnavar') || idx === 0;
        const subTitle = isHonnavar
          ? t('pfz_near_honnavar')
          : `Potential Fishing Zone near ${advisory.title}`;

        const coordMatch = (advisory.description || '').match(/\((.*?)\)/);
        const detailsText = coordMatch
          ? `${coordMatch[0]} • 79.5 km • 57m depth`
          : '(14.17°N, 73.94°E) • 79.5 km • 57m depth';

        return (
          <TouchableOpacity
            key={advisory.id || idx}
            style={styles.card}
            activeOpacity={0.85}
            onPress={onViewMap}>
            {/* Circular Dark Teal Fish Badge */}
            <View style={styles.fishBadge}>
              <Icon name="fish" size={22} color="#FFFFFF" />
            </View>

            {/* Advisory Information */}
            <View style={styles.infoColumn}>
              <Text style={styles.cardTitle}>{t('favorable_for_fishing')}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {subTitle}
              </Text>
              <Text style={styles.cardDetails} numberOfLines={1}>
                {detailsText}
              </Text>
            </View>

            {/* Right Chevron */}
            <Icon name="chevron-right" size={22} color="#0D9488" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  card: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fishBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoColumn: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
});

export default FishingAdvisory;
