/**
 * AlertDetailModal — Detailed view for alerts with Coastal Kannada narration,
 * nautical parameters, and voice broadcast playback.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import Badge from '../common/Badge';
import type { AlertItem } from '../../data/mockAlerts';
import { useLanguage } from '../../i18n';

interface AlertDetailModalProps {
  visible: boolean;
  alert: AlertItem | null;
  onClose: () => void;
  onNavigateToMap?: (alert: AlertItem) => void;
}

const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  visible,
  alert,
  onClose,
  onNavigateToMap,
}) => {
  const { language } = useLanguage();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      setIsPlayingAudio(false);
      setAudioProgress(0);
    }
  }, [visible]);

  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 12;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  if (!alert) return null;

  // Extract nautical details from body if present
  const isAdvisory = alert.category === 'advisory' || alert.source.includes('INCOIS');
  const distanceMatch = alert.body.match(/(\d+\.?\d*)\s*km/i);
  const bearingMatch = alert.body.match(/bearing\s*(\d+)/i);
  const depthMatch = alert.body.match(/depth\s*(\d+)\s*m/i);

  // Generate Coastal Kannada audio narrative
  const kannadaNarrative = isAdvisory
    ? `${alert.title} ವಲಯ ಮಾಹಿತಿ: ಕರಾವಳಿ ತೀರದಿಂದ ಸುಮಾರು ${distanceMatch ? distanceMatch[1] : '75'} ಕಿ.ಮೀ ದೂರದಲ್ಲಿ ಆಳ ${depthMatch ? depthMatch[1] : '60'} ಮೀಟರ್‌ನಲ್ಲಿ ಮೀನು ಇರುವ ಜಾಗ ಪತ್ತೆಯಾಗಿದೆ. ಬಂಗುಡೆ, ಭೂತಾಯಿ ಹಾಗೂ ಗೆದ್ದರ್ ಮೀನುಗಳು ಹೆಚ್ಚು ಸಿಗುವ ಸಾಧ್ಯತೆಯಿದೆ. ಸಮುದ್ರ ಶಾಂತವಾಗಿದೆ.`
    : `ಹವಾಮಾನ ಮುನ್ನೆಚ್ಚರಿಕೆ: ${alert.title}. ಸಮುದ್ರದಲ್ಲಿ ಗಾಳಿಯ ವೇಗ ಮತ್ತು ಅಲೆಗಳ ಏರಿಳಿತ ಕಂಡುಬಂದಿದೆ. ಚಿಕ್ಕ ದೋಣಿಗಳು ಹಾಗೂ ನಾಡದೋಣಿಗಳು ಎಚ್ಚರಿಕೆ ವಹಿಸಬೇಕು.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Icon
                  name={alert.icon || (isAdvisory ? 'fish' : 'alert-circle')}
                  size={22}
                  color={isAdvisory ? Colors.primaryAccent : Colors.danger}
                />
              </View>
              <View>
                <Badge
                  label={alert.badgeLabel}
                  variant={alert.severity}
                  small
                />
                <Text style={styles.sourceText}>
                  {alert.source} • {alert.timestamp}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}>
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.alertTitle}>{alert.title}</Text>

            {/* Nautical Parameters Grid (for INCOIS advisories) */}
            {isAdvisory && (distanceMatch || bearingMatch || depthMatch) && (
              <View style={styles.metricsCard}>
                <Text style={styles.metricsCardTitle}>NAUTICAL WAYPOINT TELEMETRY</Text>
                <View style={styles.metricsGrid}>
                  {distanceMatch && (
                    <View style={styles.metricItem}>
                      <Icon name="map-marker-distance" size={18} color={Colors.primaryAccent} />
                      <Text style={styles.metricItemLabel}>DISTANCE</Text>
                      <Text style={styles.metricItemValue}>{distanceMatch[1]} km</Text>
                      <Text style={styles.metricItemSub}>
                        ({(parseFloat(distanceMatch[1]) / 1.852).toFixed(1)} NM)
                      </Text>
                    </View>
                  )}
                  {bearingMatch && (
                    <View style={styles.metricItem}>
                      <Icon name="compass" size={18} color={Colors.oceanBlue} />
                      <Text style={styles.metricItemLabel}>BEARING</Text>
                      <Text style={styles.metricItemValue}>{bearingMatch[1]}°</Text>
                      <Text style={styles.metricItemSub}>Offshore Heading</Text>
                    </View>
                  )}
                  {depthMatch && (
                    <View style={styles.metricItem}>
                      <Icon name="wave" size={18} color={Colors.caution} />
                      <Text style={styles.metricItemLabel}>SEA DEPTH</Text>
                      <Text style={styles.metricItemValue}>{depthMatch[1]} m</Text>
                      <Text style={styles.metricItemSub}>Bathymetry</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Official English Bulletin */}
            <View style={styles.bulletinSection}>
              <Text style={styles.sectionHeader}>OFFICIAL BULLETIN TEXT</Text>
              <Text style={styles.bulletinBody}>{alert.body}</Text>
            </View>

            {/* Coastal Kannada Translation & Advice */}
            <View style={styles.kannadaCard}>
              <View style={styles.kannadaHeader}>
                <Icon name="translate" size={18} color={Colors.primaryAccent} />
                <Text style={styles.kannadaHeaderTitle}>ಕರಾವಳಿ ಮೀನುಗಾರರ ವಿವರಣೆ (Kannada)</Text>
              </View>
              <Text style={styles.kannadaBody}>{kannadaNarrative}</Text>
            </View>

            {/* Voice Announcement Audio Player */}
            <View style={styles.audioPlayerCard}>
              <View style={styles.audioHeader}>
                <Icon name="volume-high" size={20} color={Colors.oceanBlue} />
                <Text style={styles.audioTitle}>VOICE BROADCAST (ಧ್ವನಿ ಸಂದೇಶ)</Text>
              </View>

              <View style={styles.audioControlsRow}>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    isPlayingAudio && styles.playButtonActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setIsPlayingAudio(!isPlayingAudio)}>
                  <Icon
                    name={isPlayingAudio ? 'pause' : 'play'}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.playButtonText}>
                    {isPlayingAudio ? 'ವಿರಾಮ (Pause)' : 'ಧ್ವನಿ ಆಲಿಸಿ (Play Audio)'}
                  </Text>
                </TouchableOpacity>

                {isPlayingAudio && (
                  <View style={styles.waveContainer}>
                    <View style={[styles.waveBar, { height: 16 }]} />
                    <View style={[styles.waveBar, { height: 26 }]} />
                    <View style={[styles.waveBar, { height: 12 }]} />
                    <View style={[styles.waveBar, { height: 22 }]} />
                    <View style={[styles.waveBar, { height: 18 }]} />
                  </View>
                )}
              </View>

              {isPlayingAudio && (
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${audioProgress}%` }]} />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.modalFooter}>
            {isAdvisory && onNavigateToMap && (
              <TouchableOpacity
                style={styles.mapButton}
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onNavigateToMap(alert);
                }}>
                <Icon name="map-marker-path" size={18} color="#FFFFFF" />
                <Text style={styles.mapButtonText}>
                  {language === 'kn' ? 'ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಿ' : 'Plot on Marine Map'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.dismissButton}
              activeOpacity={0.7}
              onPress={onClose}>
              <Text style={styles.dismissButtonText}>
                {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Dismiss'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 37, 64, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
    ...Shadows.bottomSheet,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  alertTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  metricsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: Spacing.md,
  },
  metricsCardTitle: {
    ...Typography.micro,
    color: '#15803D',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  metricItemLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '700',
  },
  metricItemValue: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    fontSize: 14,
    marginTop: 2,
  },
  metricItemSub: {
    ...Typography.micro,
    color: Colors.textMuted,
    fontSize: 9,
  },
  bulletinSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.oceanBlue,
  },
  sectionHeader: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bulletinBody: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  kannadaCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  kannadaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kannadaHeaderTitle: {
    ...Typography.micro,
    color: '#1E40AF',
    fontWeight: '700',
  },
  kannadaBody: {
    ...Typography.body,
    color: '#1E293B',
    lineHeight: 22,
    fontWeight: '500',
  },
  audioPlayerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  audioTitle: {
    ...Typography.micro,
    color: Colors.oceanBlue,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.oceanBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  playButtonActive: {
    backgroundColor: '#D97706',
  },
  playButtonText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
  },
  waveBar: {
    width: 4,
    backgroundColor: Colors.oceanBlue,
    borderRadius: 2,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.oceanBlue,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  mapButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryAccent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.fab,
  },
  mapButtonText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dismissButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  dismissButtonText: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default AlertDetailModal;
