import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import {
  getEquipmentChecklist,
  toggleEquipmentItem,
  resetEquipmentChecklist,
  type ChecklistItem,
} from '../../services/storage/equipmentStorage';
import { useLanguage, type TranslationKey } from '../../i18n';

interface EquipmentChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  currentPort: string;
}

const ITEM_TRANSLATION_MAP: Record<string, { labelKey: TranslationKey; descKey: TranslationKey }> = {
  life_jackets: { labelKey: 'eq_item_life_jackets', descKey: 'eq_item_life_jackets_desc' },
  vhf_radio: { labelKey: 'eq_item_vhf', descKey: 'eq_item_vhf_desc' },
  gps_device: { labelKey: 'eq_item_gps', descKey: 'eq_item_gps_desc' },
  distress_flares: { labelKey: 'eq_item_flares', descKey: 'eq_item_flares_desc' },
  extra_fuel_water: { labelKey: 'eq_item_fuel_water', descKey: 'eq_item_fuel_water_desc' },
  first_aid: { labelKey: 'eq_item_first_aid', descKey: 'eq_item_first_aid_desc' },
  anchor_bilge: { labelKey: 'eq_item_anchor', descKey: 'eq_item_anchor_desc' },
};

const EquipmentChecklistModal: React.FC<EquipmentChecklistModalProps> = ({
  visible,
  onClose,
  currentPort,
}) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (visible) {
      loadChecklist();
    }
  }, [visible]);

  const loadChecklist = async () => {
    const data = await getEquipmentChecklist();
    setItems(data);
  };

  const handleToggle = async (id: string) => {
    const updated = await toggleEquipmentItem(id);
    setItems(updated);
  };

  const handleReset = () => {
    Alert.alert(t('eq_title'), t('eq_reset_btn'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: t('eq_reset_btn'),
        style: 'destructive',
        onPress: async () => {
          const reset = await resetEquipmentChecklist();
          setItems(reset);
        },
      },
    ]);
  };

  const { readyCount, totalCount, percentage, requiredPassed } = useMemo(() => {
    const ready = items.filter((i) => i.checked).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
    const requiredAllChecked = items.filter((i) => i.required).every((i) => i.checked);
    return {
      readyCount: ready,
      totalCount: total,
      percentage: pct,
      requiredPassed: requiredAllChecked,
    };
  }, [items]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="wrench" size={24} color={Colors.primaryAccent} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('eq_title')}</Text>
                <Text style={styles.headerSubtitle}>
                  {t('eq_subtitle')} • {currentPort}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Readiness Meter Card */}
          <View style={styles.readinessCard}>
            <View style={styles.readinessTop}>
              <View>
                <Text style={styles.readinessTitle}>{t('eq_readiness_title')}</Text>
                <Text style={styles.readinessSubtitle}>
                  {readyCount} / {totalCount} {t('eq_safety_count')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: requiredPassed ? 'rgba(56, 142, 60, 0.2)' : 'rgba(230, 81, 0, 0.2)' },
                ]}>
                <Text
                  style={[
                    styles.statusPillText,
                    { color: requiredPassed ? '#4CAF50' : '#FF9800' },
                  ]}>
                  {requiredPassed ? t('eq_ready_to_sail') : t('eq_attention_required')}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: requiredPassed ? Colors.safe : '#FF9800',
                  },
                ]}
              />
            </View>
          </View>

          {/* Checklist Items */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const trans = ITEM_TRANSLATION_MAP[item.id];
              const displayLabel = trans ? t(trans.labelKey, item.label) : item.label;
              const displayDesc = trans ? t(trans.descKey, item.description) : item.description;

              return (
                <TouchableOpacity
                  style={[styles.itemCard, item.checked && styles.itemCardChecked]}
                  activeOpacity={0.7}
                  onPress={() => handleToggle(item.id)}>
                  <View style={styles.checkboxWrap}>
                    <Icon
                      name={item.checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={24}
                      color={item.checked ? Colors.primaryAccent : Colors.textSubtleOnDark}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}>
                        {displayLabel}
                      </Text>
                      {item.required ? (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.itemDesc}>{displayDesc}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <View style={styles.footerWrap}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
                  <Icon name="refresh" size={16} color={Colors.textSecondary} />
                  <Text style={styles.resetBtnText}>{t('eq_reset_btn')}</Text>
                </TouchableOpacity>
              </View>
            }
          />
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
  readinessCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  readinessTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  readinessTitle: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    letterSpacing: 0.5,
  },
  readinessSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textOnDark,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusPillText: {
    ...Typography.micro,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemCardChecked: {
    backgroundColor: 'rgba(15, 166, 136, 0.08)',
    borderColor: 'rgba(15, 166, 136, 0.25)',
  },
  checkboxWrap: {
    padding: 2,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textOnDark,
    flex: 1,
  },
  itemLabelChecked: {
    color: Colors.primaryAccent,
  },
  requiredBadge: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  requiredBadgeText: {
    ...Typography.micro,
    color: '#FF6B6B',
    fontSize: 9,
    fontWeight: '800',
  },
  itemDesc: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
    lineHeight: 15,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
  },
  resetBtnText: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default EquipmentChecklistModal;
