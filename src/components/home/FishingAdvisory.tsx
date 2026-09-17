import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { Advisory } from '../../data/mockAdvisory';
import { useLanguage } from '../../i18n';

interface FishingAdvisoryProps {
  advisories: Advisory[];
  onViewMap?: () => void;
  onViewAll?: () => void;
}

const severityColors = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const FishingAdvisory: React.FC<FishingAdvisoryProps> = ({
  advisories,
  onViewMap,
  onViewAll,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const getTranslatedBadge = (advisory: Advisory) => {
    const raw = (advisory.badgeLabel || '').toUpperCase();
    if (advisory.severity === 'safe' || raw.includes('FAVOR')) return t('cond_favorable');
    if (advisory.severity === 'caution' || raw.includes('CAUTION')) return t('cond_caution');
    if (advisory.severity === 'danger' || raw.includes('DANGER')) return t('cond_dangerous');
    return advisory.badgeLabel;
  };

  const displayAdvisories = isExpanded ? advisories : advisories.slice(0, 3);
  const hasMore = advisories.length > 3;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      {/* Section Header: Today's Advisory + View All link */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>{t('advisory_title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{advisories.length}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewAll || handleToggleExpand}
          activeOpacity={0.7}>
          <Text style={styles.viewMapLink}>
            {isExpanded ? `${t('advisory_show_less')} ↑` : `${t('view_all')} →`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Advisory Cards */}
      {displayAdvisories.map((advisory) => {
        const isSafe = advisory.severity === 'safe';
        const isDanger = advisory.severity === 'danger';
        const badgeColor = isDanger
          ? Colors.dangerText
          : isSafe
          ? Colors.safeText
          : Colors.cautionText;
        const iconBg = isDanger
          ? Colors.danger
          : isSafe
          ? Colors.primaryAccent
          : Colors.caution;

        return (
          <TouchableOpacity
            key={advisory.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={onViewMap}>
            {/* Header row with circular fish badge, title, and chevron */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.badgeGroup}>
                <View style={[styles.circleIcon, { backgroundColor: iconBg }]}>
                  <Icon
                    name={advisory.subIcon || 'fish'}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.badgeLabel, { color: badgeColor }]}>
                  {getTranslatedBadge(advisory)}
                </Text>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={Colors.textMuted}
              />
            </View>

            {/* Description / Coordinates */}
            <Text style={styles.description}>{advisory.description}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Expand / Collapse Button */}
      {hasMore && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={handleToggleExpand}
          activeOpacity={0.7}>
          <Text style={styles.expandButtonText}>
            {isExpanded
              ? t('advisory_show_less')
              : `${t('advisory_view_more')} (+${advisories.length - 3})`}
          </Text>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.primaryAccent}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(15, 166, 136, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: BorderRadius.pill,
  },
  countText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '800',
    fontSize: 11,
  },
  viewMapLink: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '700',
    fontSize: 12.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    marginBottom: Spacing.xs + 2,
    ...Shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  circleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm - 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 2,
    ...Shadows.card,
  },
  expandButtonText: {
    ...Typography.label,
    color: Colors.primaryAccent,
    fontWeight: '700',
    fontSize: 12,
  },
});

export default FishingAdvisory;

