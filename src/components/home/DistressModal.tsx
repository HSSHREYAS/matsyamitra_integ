/**
 * DistressModal — Emergency Distress Beacon & Coastal Guard Hotline.
 * Prepares instant SMS with offline coordinates to broadcast emergency status over 2G/cellular.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useLanguage, type TranslationKey } from '../../i18n';

interface DistressModalProps {
  visible: boolean;
  onClose: () => void;
  currentPort: string;
  latitude?: number;
  longitude?: number;
}

interface EmergencyContactItem {
  id: string;
  titleKey: TranslationKey;
  subKey: TranslationKey;
  titleFallback: string;
  subFallback: string;
  phone: string;
  icon: string;
}

const EMERGENCY_CONTACTS: EmergencyContactItem[] = [
  {
    id: 'coast_guard',
    titleKey: 'sos_coast_guard',
    subKey: 'sos_coast_guard_sub',
    titleFallback: 'Indian Coast Guard SAR',
    subFallback: 'National Maritime Search & Rescue (Toll Free)',
    phone: '1554',
    icon: 'shield-alert',
  },
  {
    id: 'karnataka_coastal_police',
    titleKey: 'sos_coastal_police',
    subKey: 'sos_coastal_police_sub',
    titleFallback: 'Karnataka Coastal Police',
    subFallback: 'Coastal Security Police Helpline (CSP)',
    phone: '1093',
    icon: 'police-badge',
  },
  {
    id: 'emergency_national',
    titleKey: 'sos_emergency_112',
    subKey: 'sos_emergency_112_sub',
    titleFallback: 'National Emergency Service',
    subFallback: 'Police, Ambulance & Fire Integrated',
    phone: '112',
    icon: 'phone-alert',
  },
];

const DistressModal: React.FC<DistressModalProps> = ({
  visible,
  onClose,
  currentPort,
  latitude,
  longitude,
}) => {
  const { t } = useLanguage();
  const [isSosActive, setIsSosActive] = useState(false);

  const latStr = latitude ? latitude.toFixed(4) : 'Unknown';
  const lonStr = longitude ? longitude.toFixed(4) : 'Unknown';

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Failed', `Could not automatically dial ${phoneNumber}. Please dial manually.`);
    });
  };

  const handleSendEmergencySms = () => {
    const timestamp = new Date().toLocaleTimeString();
    const smsBody = `MAYDAY! EMERGENCY DISTRESS BEACON from MatsyaMitra. Vessel needs immediate assistance near ${currentPort}. Location: Lat ${latStr}°N, Lon ${lonStr}°E. Time: ${timestamp}. Please dispatch Search & Rescue.`;

    // 1093 is standard coastal emergency receiver
    const smsUrl = `sms:1093?body=${encodeURIComponent(smsBody)}`;

    Linking.openURL(smsUrl)
      .then(() => {
        setIsSosActive(true);
      })
      .catch(() => {
        Alert.alert(
          'SMS Client Not Available',
          `Could not open default SMS client.\n\nPlease send text to 1093 with:\n"MAYDAY at Lat ${latStr}, Lon ${lonStr}"`,
        );
      });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="alert-octagon" size={26} color="#FF4D4D" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('sos_title')}</Text>
                <Text style={styles.headerSubtitle}>{t('sos_subtitle')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* GPS Coordinates Beacon Card */}
            <View style={styles.beaconCard}>
              <View style={styles.beaconHeader}>
                <View style={styles.beaconIndicator} />
                <Text style={styles.beaconTitle}>{t('sos_position_beacon')}</Text>
              </View>

              <View style={styles.coordsRow}>
                <View style={styles.coordBox}>
                  <Text style={styles.coordLabel}>{t('sos_latitude')}</Text>
                  <Text style={styles.coordValue}>{latStr}° N</Text>
                </View>
                <View style={styles.coordDivider} />
                <View style={styles.coordBox}>
                  <Text style={styles.coordLabel}>{t('sos_longitude')}</Text>
                  <Text style={styles.coordValue}>{lonStr}° E</Text>
                </View>
              </View>
              <Text style={styles.stationNote}>{currentPort} (Karnataka Coast)</Text>
            </View>

            {/* Main SOS Trigger Button */}
            <TouchableOpacity
              style={[styles.sosButton, isSosActive && styles.sosButtonActive]}
              activeOpacity={0.8}
              onPress={handleSendEmergencySms}>
              <View style={styles.sosPulseIcon}>
                <Icon name="broadcast" size={32} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sosBtnTitle}>
                  {isSosActive ? 'DISTRESS BROADCAST SENT' : t('sos_broadcast_btn')}
                </Text>
                <Text style={styles.sosBtnSubtitle}>
                  {t('sos_broadcast_sub')}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Helpline Section */}
            <Text style={styles.sectionHeader}>{t('sos_helpline_heading')}</Text>
            <View style={styles.contactsWrap}>
              {EMERGENCY_CONTACTS.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactLeft}>
                    <View style={styles.contactIconBox}>
                      <Icon name={contact.icon} size={22} color="#FF6B6B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactTitle}>{t(contact.titleKey, contact.titleFallback)}</Text>
                      <Text style={styles.contactSubtitle}>{t(contact.subKey, contact.subFallback)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(contact.phone)}
                    activeOpacity={0.7}>
                    <Icon name="phone" size={16} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>
                      {t('sos_call_btn')} {contact.phone}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Important Info Alert */}
            <View style={styles.infoBox}>
              <Icon name="information-outline" size={20} color={Colors.primaryAccent} />
              <Text style={styles.infoText}>
                {t('sos_2g_notice')}
              </Text>
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
    borderColor: 'rgba(255, 77, 77, 0.2)',
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
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
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
  beaconCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.lg,
  },
  beaconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  beaconIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
  },
  beaconTitle: {
    ...Typography.micro,
    color: '#FF6B6B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  coordBox: {
    flex: 1,
    alignItems: 'center',
  },
  coordDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  coordLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    marginBottom: 2,
  },
  coordValue: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textOnDark,
  },
  stationNote: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  sosButton: {
    backgroundColor: '#D32F2F',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.cardHeavy,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sosButtonActive: {
    backgroundColor: '#388E3C',
  },
  sosPulseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtnTitle: {
    ...Typography.body,
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 14,
  },
  sosBtnSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  sectionHeader: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtleOnDark,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  contactsWrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
    marginRight: Spacing.sm,
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  contactSubtitle: {
    ...Typography.bodySmall,
    fontSize: 10,
    color: Colors.textSubtleOnDark,
    marginTop: 1,
  },
  callBtn: {
    backgroundColor: '#FF4D4D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  callBtnText: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 166, 136, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(15, 166, 136, 0.2)',
  },
  infoText: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});

export default DistressModal;
