/**
 * LocationSelectorModal — Clean modal for searching and selecting from the 25 canonical coastal locations.
 * Exclusively displays human-readable city and coastal station names with live telemetry coordinates.
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import {
  CANONICAL_LOCATIONS,
  getCanonicalCityName,
  type CurrentStateResponse,
} from '../../services/api';
import { useLanguage } from '../../i18n';

export interface LocationItemData {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  riskCategory?: string;
}

interface LocationSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (locationId: string) => void;
  selectedLocationId?: string;
  states?: CurrentStateResponse[];
}

const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
  selectedLocationId,
  states = [],
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Map state details onto canonical locations list
  const locationItems = useMemo<LocationItemData[]>(() => {
    const stateMap = new Map<string, CurrentStateResponse>();
    for (const s of states) {
      if (s.location_id) {
        stateMap.set(s.location_id.toUpperCase(), s);
      }
    }

    return CANONICAL_LOCATIONS.map((loc) => {
      const liveState = stateMap.get(loc.id.toUpperCase());
      return {
        id: loc.id,
        name: getCanonicalCityName(loc.id, liveState?.city_name),
        latitude: liveState?.latitude,
        longitude: liveState?.longitude,
        riskCategory: liveState?.risk?.category,
      };
    });
  }, [states]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      return locationItems;
    }
    return locationItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(trimmed);
      const coordMatch =
        item.latitude !== undefined &&
        item.longitude !== undefined &&
        `${item.latitude.toFixed(2)} ${item.longitude.toFixed(2)}`.includes(trimmed);
      return nameMatch || coordMatch;
    });
  }, [locationItems, searchQuery]);

  const handleSelect = (locationId: string) => {
    onSelectLocation(locationId);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const renderLocationItem = ({ item }: { item: LocationItemData }) => {
    const isSelected =
      selectedLocationId?.toUpperCase() === item.id.toUpperCase();

    const coordinatesText =
      item.latitude !== undefined && item.longitude !== undefined
        ? `${item.latitude.toFixed(2)}°N, ${item.longitude.toFixed(2)}°E`
        : 'Karnataka Coast';

    return (
      <TouchableOpacity
        style={[
          styles.locationCard,
          isSelected && styles.locationCardSelected,
        ]}
        onPress={() => handleSelect(item.id)}
        activeOpacity={0.7}>
        <View style={styles.locationCardLeft}>
          <View
            style={[
              styles.iconWrapper,
              isSelected && styles.iconWrapperSelected,
            ]}>
            <Icon
              name="map-marker-radius"
              size={20}
              color={isSelected ? Colors.primaryAccent : Colors.textSubtleOnDark}
            />
          </View>
          <View style={styles.locationTextContainer}>
            <Text
              style={[
                styles.locationName,
                isSelected && styles.locationNameSelected,
              ]}
              numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.subtextRow}>
              <Text style={styles.locationCoords}>{coordinatesText}</Text>
              {item.riskCategory && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text
                    style={[
                      styles.riskBadgeText,
                      item.riskCategory.toLowerCase().includes('high')
                        ? { color: Colors.danger }
                        : item.riskCategory.toLowerCase().includes('mod')
                        ? { color: Colors.caution }
                        : { color: Colors.safe },
                    ]}>
                    {item.riskCategory}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {isSelected ? (
          <View style={styles.checkIconContainer}>
            <Icon
              name="check-circle"
              size={22}
              color={Colors.primaryAccent}
            />
          </View>
        ) : (
          <Icon
            name="chevron-right"
            size={18}
            color="rgba(255, 255, 255, 0.2)"
          />
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContentWrapper}>
          <SafeAreaView style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>{t('loc_select_title')}</Text>
                <Text style={styles.headerSubtitle}>
                  25 canonical coastal stations along Karnataka
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="close" size={22} color={Colors.textSubtleOnDark} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchContainer}>
              <Icon
                name="magnify"
                size={20}
                color={Colors.primaryAccent}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder={t('loc_search_placeholder')}
                placeholderTextColor={Colors.textSubtleOnDark}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
                clearButtonMode="never"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon
                    name="close-circle"
                    size={18}
                    color={Colors.textSubtleOnDark}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Station Count / Status */}
            <View style={styles.counterRow}>
              <Text style={styles.counterText}>
                {filteredLocations.length === locationItems.length
                  ? `All ${locationItems.length} locations available`
                  : `Found ${filteredLocations.length} of ${locationItems.length} locations`}
              </Text>
            </View>

            {/* Location List */}
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={renderLocationItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon
                    name="map-marker-off-outline"
                    size={40}
                    color={Colors.textSubtleOnDark}
                  />
                  <Text style={styles.emptyTitle}>No locations found</Text>
                  <Text style={styles.emptySubtitle}>
                    No coastal station matches &ldquo;{searchQuery}&rdquo;
                  </Text>
                </View>
              }
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentWrapper: {
    maxHeight: '85%',
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    ...Shadows.bottomSheet,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: '#F1F5F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    height: 46,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  counterRow: {
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  counterText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  itemSeparator: {
    height: 6,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locationCardSelected: {
    backgroundColor: 'rgba(15, 166, 136, 0.08)',
    borderColor: Colors.primaryAccent,
  },
  locationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconWrapperSelected: {
    backgroundColor: 'rgba(15, 166, 136, 0.2)',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  locationNameSelected: {
    color: Colors.primaryAccent,
    fontWeight: '700',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  locationCoords: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  dotSeparator: {
    color: Colors.textSecondary,
    marginHorizontal: 4,
    fontSize: 10,
  },
  riskBadgeText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  checkIconContainer: {
    marginLeft: Spacing.xs,
  },
  emptyContainer: {
    paddingVertical: Spacing.huge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default LocationSelectorModal;
