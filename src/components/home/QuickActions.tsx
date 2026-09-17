/**
 * QuickActions — 2×2 grid of colored module tiles (Catch Logs, Distress Alerts, Fleet Tracking, Equipment).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../i18n';

interface QuickActionsProps {
  onActionPress?: (actionId: 'catch' | 'distress' | 'fleet' | 'equipment') => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionPress }) => {
  const { t } = useLanguage();

  const handlePress = (id: 'catch' | 'distress' | 'fleet' | 'equipment') => {
    if (onActionPress) {
      onActionPress(id);
    }
  };

  return (
    <View style={styles.container}>
      {/* 2×2 Grid */}
      <View style={styles.grid}>
        {/* Top-Left: Catch Logs (Soft Mint) */}
        <TouchableOpacity
          style={[styles.tile, styles.catchTile]}
          onPress={() => handlePress('catch')}
          activeOpacity={0.75}>
          <Icon name="fish" size={22} color="#0D9488" />
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t('qa_catch')}
          </Text>
        </TouchableOpacity>

        {/* Top-Right: Distress Alerts (Soft Coral) */}
        <TouchableOpacity
          style={[styles.tile, styles.distressTile]}
          onPress={() => handlePress('distress')}
          activeOpacity={0.75}>
          <Icon name="alert" size={22} color="#DC2626" />
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t('qa_distress')}
          </Text>
        </TouchableOpacity>

        {/* Bottom-Left: Fleet Tracking (Soft Sky Blue) */}
        <TouchableOpacity
          style={[styles.tile, styles.fleetTile]}
          onPress={() => handlePress('fleet')}
          activeOpacity={0.75}>
          <Icon name="sail-boat" size={22} color="#0284C7" />
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t('qa_fleet')}
          </Text>
        </TouchableOpacity>

        {/* Bottom-Right: Equipment (Soft Ice Blue) */}
        <TouchableOpacity
          style={[styles.tile, styles.equipmentTile]}
          onPress={() => handlePress('equipment')}
          activeOpacity={0.75}>
          <Icon name="wrench" size={20} color="#2563EB" />
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t('qa_equipment')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  tile: {
    width: '48.5%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
  },
  catchTile: {
    backgroundColor: '#E8F8F0',
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  distressTile: {
    backgroundColor: '#FEE8E8',
    borderColor: 'rgba(220, 38, 38, 0.15)',
  },
  fleetTile: {
    backgroundColor: '#EFF6FF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  equipmentTile: {
    backgroundColor: '#EFF6FF',
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  tileLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0A2540',
    flex: 1,
  },
});

export default QuickActions;
