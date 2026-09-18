/**
 * ProfileScreen — User Profile & Vessel Settings Screen.
 * Fully interactive with offline persistence via AsyncStorage.
 * Allows fishermen to manage vessel specifications (name, registration number, boat type),
 * choose their default coastal home port from 25 canonical stations, and configure language/alerts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useLanguage } from '../i18n';
import {
  getUserProfile,
  saveUserProfile,
  UserProfile,
  VesselType,
  DEFAULT_USER_PROFILE,
} from '../services/storage/userProfileStorage';
import LocationSelectorModal from '../components/home/LocationSelectorModal';
import { getCanonicalCityName } from '../services/api';

const VESSEL_TYPES: VesselType[] = [
  'Traditional Canoe',
  'Motorized Craft (OBM)',
  'Mechanized Trawler',
  'Purse Seiner',
  'Gillnetter',
];

const ProfileScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  // Profile data state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isVesselModalVisible, setIsVesselModalVisible] = useState(false);
  const [isPortModalVisible, setIsPortModalVisible] = useState(false);
  const [saveBannerText, setSaveBannerText] = useState<string | null>(null);

  // Form states for vessel edit modal
  const [editFisherName, setEditFisherName] = useState('');
  const [editVesselName, setEditVesselName] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editVesselType, setEditVesselType] = useState<VesselType>('Mechanized Trawler');

  // Load profile on mount
  useEffect(() => {
    let isMounted = true;
    getUserProfile().then((saved) => {
      if (isMounted) {
        setProfile(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setSaveBannerText(msg);
    setTimeout(() => {
      setSaveBannerText(null);
    }, 3200);
  }, []);

  // Open vessel edit modal with current values
  const handleOpenVesselModal = () => {
    setEditFisherName(profile.fisherName);
    setEditVesselName(profile.vesselName);
    setEditRegNumber(profile.registrationNumber);
    setEditVesselType(profile.vesselType);
    setIsVesselModalVisible(true);
  };

  // Save vessel details
  const handleSaveVessel = async () => {
    if (!editVesselName.trim()) {
      Alert.alert('Validation', 'Please enter a vessel name.');
      return;
    }

    try {
      const updated = await saveUserProfile({
        fisherName: editFisherName.trim() || profile.fisherName,
        vesselName: editVesselName.trim(),
        registrationNumber: editRegNumber.trim() || profile.registrationNumber,
        vesselType: editVesselType,
      });
      setProfile(updated);
      setIsVesselModalVisible(false);
      showToast(t('profile_save_success'));
    } catch (error) {
      Alert.alert('Error', 'Failed to save vessel details locally.');
    }
  };

  // Select home port from canonical locations modal
  const handleSelectHomePort = async (locationId: string) => {
    const cityName = getCanonicalCityName(locationId);
    try {
      const updated = await saveUserProfile({
        defaultPortId: locationId,
        defaultPortName: cityName,
      });
      setProfile(updated);
      setIsPortModalVisible(false);
      showToast(`${t('profile_default_port')}: ${cityName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save home port.');
    }
  };

  // Notification toggles
  const handleTogglePush = async (val: boolean) => {
    try {
      const updated = await saveUserProfile({ pushNotifications: val });
      setProfile(updated);
    } catch {}
  };

  const handleToggleWeather = async (val: boolean) => {
    try {
      const updated = await saveUserProfile({ weatherAlerts: val });
      setProfile(updated);
    } catch {}
  };

  // Translate vessel type
  const getLocalizedVesselType = (type: VesselType) => {
    switch (type) {
      case 'Traditional Canoe':
        return t('vessel_traditional_canoe');
      case 'Motorized Craft (OBM)':
        return t('vessel_motorized_craft');
      case 'Mechanized Trawler':
        return t('vessel_mechanized_trawler');
      case 'Purse Seiner':
        return t('vessel_purse_seiner');
      case 'Gillnetter':
        return t('vessel_gillnetter');
      default:
        return type;
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primaryBackground} />

      {/* Floating Save Feedback Banner */}
      {saveBannerText && (
        <View style={styles.toastBanner}>
          <Icon name="check-circle" size={18} color="#10B981" />
          <Text style={styles.toastText}>{saveBannerText}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{t('profile_title')}</Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={handleOpenVesselModal}>
            <Icon name="pencil" size={20} color={Colors.primaryAccent} />
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="sail-boat" size={38} color={Colors.primaryAccent} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.fisherName}</Text>
            <Text style={styles.profileSubtitle}>
              {profile.vesselName} • {profile.defaultPortName}
            </Text>
            <View style={styles.verifiedRow}>
              <Icon name="check-decagram" size={16} color={Colors.primaryAccent} />
              <Text style={styles.verifiedText}>{t('profile_fisher_verified')}</Text>
              <Text style={styles.fisherIdTag}>({profile.fisherId})</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.tripsCount}</Text>
            <Text style={styles.statLabel}>{t('profile_stat_trips')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.experienceYears}</Text>
            <Text style={styles.statLabel}>{t('profile_stat_exp')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8 ★</Text>
            <Text style={styles.statLabel}>{t('profile_stat_rating')}</Text>
          </View>
        </View>

        {/* Vessel Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('profile_vessel_info')}</Text>
            <TouchableOpacity
              onPress={handleOpenVesselModal}
              style={styles.editActionLink}
              activeOpacity={0.7}>
              <Icon name="pencil-outline" size={14} color={Colors.primaryAccent} />
              <Text style={styles.editActionText}>{t('profile_edit_vessel')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <View style={[styles.sectionItem, styles.sectionItemBorder]}>
              <View style={styles.sectionItemLeft}>
                <Icon name="sail-boat" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_vessel_name')}</Text>
              </View>
              <Text style={styles.itemValue}>{profile.vesselName}</Text>
            </View>

            <View style={[styles.sectionItem, styles.sectionItemBorder]}>
              <View style={styles.sectionItemLeft}>
                <Icon name="card-account-details-outline" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_reg_number')}</Text>
              </View>
              <Text style={styles.itemValue}>{profile.registrationNumber}</Text>
            </View>

            <View style={styles.sectionItem}>
              <View style={styles.sectionItemLeft}>
                <Icon name="ferry" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_vessel_type')}</Text>
              </View>
              <Text style={styles.itemValue}>
                {getLocalizedVesselType(profile.vesselType)}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Settings Section (Default Home Port) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile_location_settings')}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.sectionItem, styles.sectionItemBorder]}
              onPress={() => setIsPortModalVisible(true)}
              activeOpacity={0.75}>
              <View style={styles.sectionItemLeft}>
                <Icon name="map-marker-radius" size={20} color={Colors.primaryAccent} />
                <View>
                  <Text style={styles.itemLabel}>{t('profile_default_port')}</Text>
                  <Text style={styles.itemSublabel}>
                    {t('profile_select_port')}
                  </Text>
                </View>
              </View>
              <View style={styles.portBadgeRight}>
                <Text style={styles.portBadgeText}>{profile.defaultPortName}</Text>
                <Icon name="chevron-right" size={18} color={Colors.primaryAccent} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionItem}>
              <View style={styles.sectionItemLeft}>
                <Icon name="compass-outline" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_coverage_area')}</Text>
              </View>
              <Text style={styles.itemValue}>{t('profile_karnataka_coast')}</Text>
            </View>
          </View>
        </View>

        {/* Language Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile_language_title')}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.toggleItem, { paddingVertical: Spacing.md }]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.7}>
              <View style={styles.sectionItemLeft}>
                <Icon name="translate" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>English</Text>
              </View>
              {language === 'en' && (
                <Icon name="check-circle" size={22} color={Colors.primaryAccent} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.toggleItem, { paddingVertical: Spacing.md }]}
              onPress={() => setLanguage('kn')}
              activeOpacity={0.7}>
              <View style={styles.sectionItemLeft}>
                <Icon name="translate" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>ಕನ್ನಡ (Coastal Kannada)</Text>
              </View>
              {language === 'kn' && (
                <Icon name="check-circle" size={22} color={Colors.primaryAccent} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile_notifications_title')}</Text>
          <View style={styles.sectionCard}>
            <View style={styles.toggleItem}>
              <View style={styles.sectionItemLeft}>
                <Icon name="bell-outline" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_push_notifications')}</Text>
              </View>
              <Switch
                value={profile.pushNotifications}
                onValueChange={handleTogglePush}
                trackColor={{ false: '#767577', true: Colors.primaryAccentLight }}
                thumbColor={profile.pushNotifications ? Colors.primaryAccent : '#f4f3f4'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleItem}>
              <View style={styles.sectionItemLeft}>
                <Icon name="weather-lightning-rainy" size={20} color={Colors.primaryAccent} />
                <Text style={styles.itemLabel}>{t('profile_weather_alerts')}</Text>
              </View>
              <Switch
                value={profile.weatherAlerts}
                onValueChange={handleToggleWeather}
                trackColor={{ false: '#767577', true: Colors.primaryAccentLight }}
                thumbColor={profile.weatherAlerts ? Colors.primaryAccent : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>MatsyaMitra v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>
            Coastal Decision Support & Marine Intelligence
          </Text>
          <Text style={styles.appInfoSubtext}>Karnataka Fisheries Department, India</Text>
        </View>
      </ScrollView>

      {/* Edit Vessel Modal */}
      <Modal
        visible={isVesselModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVesselModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Icon name="sail-boat" size={22} color={Colors.primaryAccent} />
                <Text style={styles.modalTitle}>{t('profile_edit_vessel')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsVesselModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Fisher Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fisherman Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFisherName}
                  onChangeText={setEditFisherName}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Vessel Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile_vessel_name')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editVesselName}
                  onChangeText={setEditVesselName}
                  placeholder="e.g. Sagar Rani"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Registration Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile_reg_number')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editRegNumber}
                  onChangeText={setEditRegNumber}
                  placeholder="e.g. KA-MNG-2024-1856"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              </View>

              {/* Vessel Type Picker (Chips) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile_vessel_type')}</Text>
                <View style={styles.vesselChipGrid}>
                  {VESSEL_TYPES.map((vt) => {
                    const isSelected = editVesselType === vt;
                    return (
                      <TouchableOpacity
                        key={vt}
                        style={[
                          styles.vesselChip,
                          isSelected && styles.vesselChipSelected,
                        ]}
                        onPress={() => setEditVesselType(vt)}
                        activeOpacity={0.75}>
                        <Icon
                          name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                          size={16}
                          color={isSelected ? '#FFFFFF' : Colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.vesselChipText,
                            isSelected && styles.vesselChipTextSelected,
                          ]}>
                          {getLocalizedVesselType(vt)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsVesselModalVisible(false)}
                activeOpacity={0.8}>
                <Text style={styles.btnCancelText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSaveVessel}
                activeOpacity={0.85}>
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.btnSaveText}>{t('profile_btn_save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reusable Canonical Location / Home Port Selector Modal */}
      <LocationSelectorModal
        visible={isPortModalVisible}
        onClose={() => setIsPortModalVisible(false)}
        onSelectLocation={handleSelectHomePort}
        selectedLocationId={profile.defaultPortId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  toastBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 999,
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#059669',
    ...Shadows.card,
  },
  toastText: {
    ...Typography.bodySmall,
    color: '#ECFDF5',
    fontWeight: '600',
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  topBarTitle: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 166, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 166, 136, 0.25)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15, 166, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryAccent,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  profileSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  verifiedText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  fisherIdTag: {
    ...Typography.chip,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryAccent,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.chip,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  editActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  editActionText: {
    ...Typography.chip,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sectionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerLight,
  },
  sectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  itemLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemSublabel: {
    ...Typography.chip,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  itemValue: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    maxWidth: 160,
    textAlign: 'right',
    fontWeight: '500',
  },
  portBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  portBadgeText: {
    ...Typography.bodySmall,
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerLight,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  appInfoText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  appInfoSubtext: {
    ...Typography.chip,
    color: Colors.textMuted,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  vesselChipGrid: {
    gap: 8,
    marginTop: 4,
  },
  vesselChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  vesselChipSelected: {
    backgroundColor: Colors.primaryAccent,
    borderColor: Colors.primaryAccent,
  },
  vesselChipText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  vesselChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dividerLight,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  btnSave: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryAccent,
  },
  btnSaveText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ProfileScreen;
