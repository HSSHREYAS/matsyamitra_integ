/**
 * CatchLogModal — Modern offline-first modal to record catches and inspect catch history.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import {
  getCatchLogs,
  saveCatchRecord,
  deleteCatchRecord,
  type CatchRecord,
} from '../../services/storage/catchLogStorage';
import { useLanguage, type TranslationKey } from '../../i18n';

interface CatchLogModalProps {
  visible: boolean;
  onClose: () => void;
  currentPort: string;
}

const SPECIES_CONFIG: { key: TranslationKey; fallback: string }[] = [
  { key: 'species_mackerel', fallback: 'Indian Mackerel (ಬಂಗುಡೆ)' },
  { key: 'species_sardine', fallback: 'Oil Sardine (ತಾರಲೆ)' },
  { key: 'species_kingfish', fallback: 'Kingfish / Seer (ಅಂಜಲ್)' },
  { key: 'species_pomfret', fallback: 'Silver Pomfret (ಮಾಂಜಿ)' },
  { key: 'species_tuna', fallback: 'Yellowfin Tuna (ಗೆದ್ದರ್)' },
  { key: 'species_prawn', fallback: 'White Prawn (ಸೀಗಡಿ)' },
  { key: 'species_squid', fallback: 'Squid / Cuttlefish (ಬೊಂಡಾಸ್)' },
];

const CatchLogModal: React.FC<CatchLogModalProps> = ({ visible, onClose, currentPort }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<CatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');

  // Form state
  const [selectedSpeciesKey, setSelectedSpeciesKey] = useState<TranslationKey>('species_mackerel');
  const [customSpecies, setCustomSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible]);

  const loadLogs = async () => {
    const data = await getCatchLogs();
    setLogs(data);
  };

  const handleAddCatch = async () => {
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid catch weight in kg.');
      return;
    }

    const speciesName = customSpecies.trim() ? customSpecies.trim() : t(selectedSpeciesKey);
    const parsedRate = rate ? parseFloat(rate) : undefined;

    setIsSubmitting(true);
    try {
      const updated = await saveCatchRecord({
        species: speciesName,
        weightKg: parsedWeight,
        ratePerKg: parsedRate,
        port: currentPort,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setLogs(updated);
      setWeight('');
      setRate('');
      setNotes('');
      setCustomSpecies('');
      setActiveTab('history');
    } catch (err) {
      Alert.alert('Error', 'Could not save catch log offline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t('cl_title'), t('cl_delete_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteCatchRecord(id);
          setLogs(updated);
        },
      },
    ]);
  };

  const totals = useMemo(() => {
    const totalKg = logs.reduce((acc, curr) => acc + curr.weightKg, 0);
    const totalRevenue = logs.reduce((acc, curr) => acc + (curr.totalEstimatedRevenue || 0), 0);
    return { totalKg, totalRevenue };
  }, [logs]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="fish" size={24} color={Colors.primaryAccent} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('cl_title')}</Text>
                <Text style={styles.headerSubtitle}>
                  {currentPort} • {t('cl_subtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'log' && styles.activeTab]}
              onPress={() => setActiveTab('log')}>
              <Icon
                name="plus-circle-outline"
                size={16}
                color={activeTab === 'log' ? Colors.primaryAccent : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'log' && styles.activeTabText]}>
                {t('cl_new_entry')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}>
              <Icon
                name="history"
                size={16}
                color={activeTab === 'history' ? Colors.primaryAccent : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                {t('cl_history')} ({logs.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          {activeTab === 'log' ? (
            <FlatList
              data={['form']}
              keyExtractor={() => 'form'}
              showsVerticalScrollIndicator={false}
              renderItem={() => (
                <View style={styles.formContainer}>
                  {/* Common Species Selection */}
                  <Text style={styles.inputLabel}>{t('cl_select_species')}</Text>
                  <View style={styles.speciesChipWrap}>
                    {SPECIES_CONFIG.map((item) => {
                      const isSelected = selectedSpeciesKey === item.key && !customSpecies;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.speciesChip, isSelected && styles.speciesChipSelected]}
                          onPress={() => {
                            setSelectedSpeciesKey(item.key);
                            setCustomSpecies('');
                          }}>
                          <Text
                            style={[
                              styles.speciesChipText,
                              isSelected && styles.speciesChipTextSelected,
                            ]}>
                            {t(item.key, item.fallback)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Or Custom Species */}
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('cl_custom_species')}
                    placeholderTextColor={Colors.textSubtleOnDark}
                    value={customSpecies}
                    onChangeText={setCustomSpecies}
                  />

                  {/* Weight & Rate Row */}
                  <View style={styles.inputRow}>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>{t('cl_weight_kg')}</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 85"
                        placeholderTextColor={Colors.textSubtleOnDark}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>{t('cl_rate_per_kg')}</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 180"
                        placeholderTextColor={Colors.textSubtleOnDark}
                        keyboardType="numeric"
                        value={rate}
                        onChangeText={setRate}
                      />
                    </View>
                  </View>

                  {/* Notes */}
                  <Text style={styles.inputLabel}>{t('cl_notes')}</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder={t('cl_notes')}
                    placeholderTextColor={Colors.textSubtleOnDark}
                    multiline
                    numberOfLines={2}
                    value={notes}
                    onChangeText={setNotes}
                  />

                  {/* Save Button */}
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleAddCatch}
                    disabled={isSubmitting}
                    activeOpacity={0.8}>
                    <Icon name="content-save" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? '...' : t('cl_btn_save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <View style={styles.historyContainer}>
              {/* Summary Banner */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('cl_total_weight')}</Text>
                  <Text style={styles.summaryValue}>{totals.totalKg.toLocaleString()} kg</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('cl_total_revenue')}</Text>
                  <Text style={[styles.summaryValue, { color: Colors.safe }]}>
                    ₹{totals.totalRevenue.toLocaleString()}
                  </Text>
                </View>
              </View>

              {logs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Icon name="fish-off" size={42} color={Colors.textSubtleOnDark} />
                  <Text style={styles.emptyTitle}>{t('cl_title')}</Text>
                  <Text style={styles.emptySubtitle}>{t('cl_no_records')}</Text>
                </View>
              ) : (
                <FlatList
                  data={logs}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <View style={styles.logCard}>
                      <View style={styles.logTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.logSpecies}>{item.species}</Text>
                          <Text style={styles.logDate}>
                            {item.dateDisplay} • {item.port}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          style={styles.deleteBtn}>
                          <Icon name="trash-can-outline" size={18} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.logMetrics}>
                        <View style={styles.metricBadge}>
                          <Icon name="scale" size={14} color={Colors.primaryAccent} />
                          <Text style={styles.metricText}>{item.weightKg} kg</Text>
                        </View>
                        {item.totalEstimatedRevenue ? (
                          <View style={[styles.metricBadge, styles.metricBadgeGold]}>
                            <Icon name="currency-inr" size={14} color="#FFB800" />
                            <Text style={[styles.metricText, { color: '#FFB800' }]}>
                              ₹{item.totalEstimatedRevenue.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {item.notes ? <Text style={styles.logNotes}>"{item.notes}"</Text> : null}
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </KeyboardAvoidingView>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(15, 166, 136, 0.15)',
  },
  tabText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.primaryAccent,
  },
  formContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  inputLabel: {
    ...Typography.micro,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtleOnDark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
  speciesChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  speciesChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  speciesChipSelected: {
    backgroundColor: 'rgba(15, 166, 136, 0.2)',
    borderColor: Colors.primaryAccent,
  },
  speciesChipText: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  speciesChipTextSelected: {
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.textOnDark,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  submitButtonText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryLabel: {
    ...Typography.micro,
    color: Colors.textSubtleOnDark,
    marginBottom: 4,
  },
  summaryValue: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logSpecies: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textOnDark,
  },
  logDate: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSubtleOnDark,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  logMetrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 166, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  metricBadgeGold: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
  },
  metricText: {
    ...Typography.bodySmall,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryAccent,
  },
  logNotes: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textOnDark,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textSubtleOnDark,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default CatchLogModal;
