/**
 * FleetTrackingModal — Karnataka coastal fleet monitoring and harbor vessel traffic summary.
 * Provides crowd density and marine safety awareness across regional landing ports.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useLanguage } from '../../i18n';

interface FleetTrackingModalProps {
  visible: boolean;
  onClose: () => void;
  currentPort: string;
}

interface PortFleetData {
  portName: string;
  activeBoats: number;
  inZoneCount: number;
  crowdLevel: 'Low' | 'Moderate' | 'High';
  crowdColor: string;
  weatherStatus: string;
}

const KARNATAKA_PORTS: PortFleetData[] = [
  {
    portName: 'Karwar Harbor (ಕಾರವಾರ)',
    activeBoats: 14,
    inZoneCount: 9,
    crowdLevel: 'Moderate',
    crowdColor: '#FFB800',
    weatherStatus: 'Clear & Moderate Swell',
  },
  {
    portName: 'Malpe Fishery Port (ಮಲ್ಪೆ)',
    activeBoats: 28,
    inZoneCount: 19,
    crowdLevel: 'High',
    crowdColor: '#FF6B6B',
    weatherStatus: 'Normal Trawler Activity',
  },
  {
    portName: 'Mangalore Old Port / Bunder (ಮಂಗಳೂರು)',
    activeBoats: 22,
    inZoneCount: 15,
    crowdLevel: 'Moderate',
    crowdColor: '#FFB800',
    weatherStatus: 'Active Purse Seine Ops',
  },
  {
    portName: 'Kundapura / Gangolli (ಕುಂದಾಪುರ)',
    activeBoats: 8,
    inZoneCount: 5,
    crowdLevel: 'Low',
    crowdColor: Colors.safe,
    weatherStatus: 'Calm & Favorable',
  },
  {
    portName: 'Honnavar Coastal Base (ಹೊನ್ನಾವರ)',
    activeBoats: 6,
    inZoneCount: 4,
    crowdLevel: 'Low',
    crowdColor: Colors.safe,
    weatherStatus: 'Artisanal Canoes Active',
  },
  {
    portName: 'Bhatkal Landing Center (ಭಟ್ಕಳ)',
    activeBoats: 11,
    inZoneCount: 7,
    crowdLevel: 'Low',
    crowdColor: Colors.safe,
    weatherStatus: 'Fair Conditions',
  },
];

const FleetTrackingModal: React.FC<FleetTrackingModalProps> = ({
  visible,
  onClose,
  currentPort,
}) => {
  const { t } = useLanguage();
  const totalActiveBoats = KARNATAKA_PORTS.reduce((acc, p) => acc + p.activeBoats, 0);
  const totalInZone = KARNATAKA_PORTS.reduce((acc, p) => acc + p.inZoneCount, 0);

  const getDensityLabel = (level: 'Low' | 'Moderate' | 'High') => {
    if (level === 'Low') return t('density_low');
    if (level === 'Moderate') return t('density_moderate');
    return t('density_high');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="sail-boat" size={24} color={Colors.primaryAccent} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('ft_title')}</Text>
                <Text style={styles.headerSubtitle}>
                  {t('ft_subtitle')} • {currentPort}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Coastal Fleet Overview Card */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>{t('ft_boats_reporting')}</Text>
                  <Text style={styles.overviewValue}>{totalActiveBoats}</Text>
                  <Text style={styles.overviewSub}>{t('ft_ports_covered')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>{t('ft_in_fishing_zones')}</Text>
                  <Text style={[styles.overviewValue, { color: Colors.primaryAccent }]}>
                    {totalInZone}
                  </Text>
                  <Text style={styles.overviewSub}>{t('ft_zone_distance')}</Text>
                </View>
              </View>

              {/* Crowd Balancing Rule Callout */}
              <View style={styles.balancingCallout}>
                <Icon name="scale-balance" size={18} color={Colors.primaryAccent} />
                <Text style={styles.balancingText}>
                  {t('ft_crowd_notice')}
                </Text>
              </View>
            </View>

            {/* Regional Harbor Vessel Status Header */}
            <Text style={styles.sectionTitle}>{t('ft_harbor_status_title')}</Text>

            {/* Port Vessel Lists */}
            <View style={styles.portsList}>
              {KARNATAKA_PORTS.map((port) => (
                <View key={port.portName} style={styles.portCard}>
                  <View style={styles.portTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.portName}>{port.portName}</Text>
                      <Text style={styles.portWeather}>{port.weatherStatus}</Text>
                    </View>
                    <View
                      style={[
                        styles.crowdBadge,
                        { backgroundColor: `${port.crowdColor}22` },
                      ]}>
                      <Text style={[styles.crowdBadgeText, { color: port.crowdColor }]}>
                        {getDensityLabel(port.crowdLevel)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.portMetrics}>
                    <View style={styles.metricItem}>
                      <Icon name="anchor" size={14} color={Colors.textSubtleOnDark} />
                      <Text style={styles.metricText}>
                        {port.activeBoats} {t('ft_vessels_registered')}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Icon name="fishbowl-outline" size={14} color={Colors.primaryAccent} />
                      <Text style={[styles.metricText, { color: Colors.primaryAccent }]}>
                        {port.inZoneCount} {t('ft_vessels_offshore')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 22, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.secondaryBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.cardHeavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(15, 166, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  overviewCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    marginBottom: 4,
  },
  overviewValue: {
    ...Typography.body,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textOnDark,
  },
  overviewSub: {
    ...Typography.bodySmall,
    fontSize: 10,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
  },
  balancingCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(15, 166, 136, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(15, 166, 136, 0.2)',
  },
  balancingText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  sectionTitle: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtleOnDark,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  portsList: {
    gap: Spacing.sm,
  },
  portCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  portTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  portName: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  portWeather: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
  },
  crowdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  crowdBadgeText: {
    ...Typography.bodySmall,
    fontSize: 10,
    fontWeight: '700',
  },
  portMetrics: {
    flexDirection: 'row',
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: Spacing.xs + 2,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 11,
  },
});

export default FleetTrackingModal;
