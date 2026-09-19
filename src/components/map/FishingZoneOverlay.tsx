/**
 * FishingZoneOverlay — Clean, Google Maps-style marine overlay.
 * 
 * In Navigation Mode (isNavigating):
 * - HIDES ALL OTHER 28 ZONES & PINS.
 * - Displays ONLY:
 *   1. Source Marker on land (Green pin: Departure Port)
 *   2. Destination Marker in sea (Red/Gold target: Selected PFZ)
 *   3. Clean Nautical Sea Route polyline connecting Source to Destination.
 * 
 * In Browse Mode (!isNavigating):
 * - Displays departure port marker on land.
 * - Displays ONLY the Top 3 Recommended Zones with clean ①, ②, ③ badges.
 * - Eliminates marker pileups and clutter.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polygon, Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import type { FishingZone } from '../../data/mockZones';
import type { RealisticSeaRoute } from '../../services/navigation/nauticalRoutingEngine';

interface FishingZoneOverlayProps {
  zones: FishingZone[];
  selectedZoneId?: string | null;
  activeRealisticRoute?: RealisticSeaRoute | null;
  isNavigating?: boolean;
  top3ZoneIds?: string[];
  onZonePress?: (zone: FishingZone) => void;
}

export function renderFishingZoneElements(
  zones: FishingZone[],
  selectedZoneId?: string | null,
  onZonePress?: (zone: FishingZone) => void,
  activeRealisticRoute?: RealisticSeaRoute | null,
  isNavigating: boolean = false,
  top3ZoneIds: string[] = []
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  const portKeyStr = activeRealisticRoute?.originPortName ? `-${activeRealisticRoute.originPortName}` : '';

  // =========================================================================
  // MODE 1: ACTIVE NAVIGATION MODE (EXACTLY LIKE GOOGLE MAPS)
  // Everything disappears except Source, Destination, and the Route!
  // =========================================================================
  if (isNavigating && activeRealisticRoute && activeRealisticRoute.coordinates.length > 1) {
    const originPoint = activeRealisticRoute.coordinates[0];
    const destinationPoint = activeRealisticRoute.coordinates[activeRealisticRoute.coordinates.length - 1];
    const selectedZone = zones.find((z) => z.id === selectedZoneId);

    // 1. Target PFZ Polygon (subtle, clean boundary)
    if (selectedZone && selectedZone.coordinates.length > 0) {
      elements.push(
        <Polygon
          key={`nav-target-polygon${portKeyStr}-${selectedZone.id}`}
          coordinates={selectedZone.coordinates}
          fillColor="rgba(15, 166, 136, 0.25)"
          strokeColor="#059669"
          strokeWidth={2.5}
          zIndex={3}
        />
      );
    }

    // 2. Nautical Polyline Glow
    elements.push(
      <Polyline
        key={`nav-route-glow${portKeyStr}-${selectedZoneId || 'route'}`}
        coordinates={activeRealisticRoute.coordinates}
        strokeColor="rgba(2, 132, 199, 0.30)"
        strokeWidth={8}
        zIndex={5}
      />
    );

    // 3. Nautical Core Route Track
    elements.push(
      <Polyline
        key={`nav-route-core${portKeyStr}-${selectedZoneId || 'route'}`}
        coordinates={activeRealisticRoute.coordinates}
        strokeColor="#0284C7"
        strokeWidth={4}
        lineDashPattern={[14, 5]}
        zIndex={6}
      />
    );

    // 4. SOURCE MARKER (ON LAND AT HARBOR) — Google Maps style green pin
    elements.push(
      <Marker
        key={`nav-source-marker${portKeyStr}`}
        coordinate={originPoint}
        title={`${activeRealisticRoute.originPortName} Port`}
        description="Departure Berth (ಪ್ರಾರಂಭ ಸ್ಥಳ)"
        anchor={{ x: 0.5, y: 0.9 }}
        tracksViewChanges={false}
        zIndex={10}>
        <View style={styles.sourcePinContainer}>
          <View style={styles.sourcePin}>
            <Icon name="anchor" size={16} color="#FFFFFF" />
            <Text style={styles.sourcePinText}>{activeRealisticRoute.originPortName}</Text>
          </View>
          <View style={styles.sourcePinStem} />
        </View>
      </Marker>
    );

    // 5. DESTINATION MARKER (IN OCEAN AT PFZ) — Google Maps style target pin
    const targetCoord = selectedZone ? selectedZone.center : destinationPoint;
    elements.push(
      <Marker
        key={`nav-dest-marker${portKeyStr}-${selectedZoneId || 'route'}`}
        coordinate={targetCoord}
        title={activeRealisticRoute.targetPfzName}
        description={`Target Zone • ${selectedZone?.potential || 90}% Potential`}
        anchor={{ x: 0.5, y: 0.9 }}
        tracksViewChanges={false}
        zIndex={10}>
        <View style={styles.destPinContainer}>
          <View style={styles.destPin}>
            <Icon name="target" size={16} color="#FFFFFF" />
            <Text style={styles.destPinText}>
              {selectedZone ? `${selectedZone.name} (${selectedZone.potential}%)` : activeRealisticRoute.targetPfzName}
            </Text>
          </View>
          <View style={styles.destPinStem} />
        </View>
      </Marker>
    );

    // In Navigation Mode, return ONLY these clean elements! No other clutter!
    return elements;
  }

  // =========================================================================
  // MODE 2: BROWSE MODE (CLEAN & CLUTTER-FREE)
  // Shows departure port on land and ONLY the Top 3 recommended zones.
  // =========================================================================

  // 1. Departure Port Marker on Land
  if (activeRealisticRoute) {
    const originPoint = activeRealisticRoute.coordinates[0];
    elements.push(
      <Marker
        key={`browse-departure-port${portKeyStr}`}
        coordinate={originPoint}
        title={`${activeRealisticRoute.originPortName} Port`}
        description="Active Departure Harbor (ಹಾರ್ಬರ್)"
        anchor={{ x: 0.5, y: 0.9 }}
        tracksViewChanges={false}
        zIndex={8}>
        <View style={styles.sourcePinContainer}>
          <View style={styles.sourcePin}>
            <Icon name="anchor" size={15} color="#FFFFFF" />
            <Text style={styles.sourcePinText}>{activeRealisticRoute.originPortName} Port</Text>
          </View>
          <View style={styles.sourcePinStem} />
        </View>
      </Marker>
    );
  }

  // NOTE: No preview polyline in browse mode — route lines only appear in full
  // navigation mode (after the user taps "VIEW SEA ROUTE"). This keeps the
  // map clean and uncluttered while browsing the Top 3 cards.

  // Filter to Top 3 zones for clean display
  const displayZones = top3ZoneIds.length > 0
    ? zones.filter((z) => top3ZoneIds.includes(z.id))
    : zones.slice(0, 3);

  // 3. Top 3 PFZ Contour Polygons
  displayZones.forEach((zone) => {
    const isSelected = zone.id === selectedZoneId;
    elements.push(
      <Polygon
        key={`poly${portKeyStr}-${zone.id}`}
        coordinates={zone.coordinates}
        fillColor={isSelected ? 'rgba(15, 166, 136, 0.32)' : 'rgba(15, 166, 136, 0.16)'}
        strokeColor={isSelected ? '#059669' : Colors.primaryAccent}
        strokeWidth={isSelected ? 2.5 : 1.5}
        tappable
        zIndex={isSelected ? 4 : 3}
        onPress={() => onZonePress?.(zone)}
      />
    );
  });

  // 4. ONLY Top 3 Center Markers (Clean ①, ②, ③ Badges — NO 29 marker wall of text!)
  displayZones.forEach((zone, index) => {
    const isSelected = zone.id === selectedZoneId;
    const rank = index + 1;
    const rankLabel = rank === 1 ? '① BEST' : rank === 2 ? '② FUEL' : '③ HIGH';
    const badgeColor = rank === 1 ? '#D97706' : rank === 2 ? '#059669' : '#0284C7';

    elements.push(
      <Marker
        key={`top3-marker${portKeyStr}-${zone.id}`}
        coordinate={zone.center}
        title={`${zone.name} (${zone.potential}%)`}
        description="Tap to select sea route (ಮಾರ್ಗ ನೋಡಿ)"
        onPress={() => onZonePress?.(zone)}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={isSelected}
        zIndex={isSelected ? 10 : 6}>
        <View
          style={[
            styles.cleanPfzMarker,
            isSelected && styles.cleanPfzMarkerSelected,
            { borderColor: isSelected ? Colors.oceanBlue : badgeColor },
          ]}>
          <View style={[styles.rankTag, { backgroundColor: badgeColor }]}>
            <Text style={styles.rankTagText}>{rankLabel}</Text>
          </View>
          <View style={styles.potentialBox}>
            <Icon name="fish" size={13} color={Colors.primaryAccentDark} />
            <Text style={styles.cleanPfzText}>{zone.potential}%</Text>
          </View>
        </View>
      </Marker>
    );
  });

  return elements;
}

const FishingZoneOverlay: React.FC<FishingZoneOverlayProps> = ({
  zones,
  selectedZoneId,
  activeRealisticRoute,
  isNavigating = false,
  top3ZoneIds = [],
  onZonePress,
}) => {
  return (
    <>
      {renderFishingZoneElements(
        zones,
        selectedZoneId,
        onZonePress,
        activeRealisticRoute,
        isNavigating,
        top3ZoneIds
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Google Maps Style Source Pin (Green on Land)
  sourcePinContainer: {
    alignItems: 'center',
  },
  sourcePin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669', // Emerald green
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  sourcePinText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  sourcePinStem: {
    width: 3,
    height: 6,
    backgroundColor: '#059669',
  },

  // Google Maps Style Destination Pin (Red/Gold in Ocean)
  destPinContainer: {
    alignItems: 'center',
  },
  destPin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626', // Red navigation target
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    gap: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  destPinText: {
    ...Typography.micro,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  destPinStem: {
    width: 3,
    height: 6,
    backgroundColor: '#DC2626',
  },

  // Clean Browse Mode Top 3 Badge
  cleanPfzMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.pill,
    paddingVertical: 2,
    paddingRight: 8,
    paddingLeft: 2,
    borderWidth: 1.8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    gap: 4,
  },
  cleanPfzMarkerSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  rankTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  rankTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  potentialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cleanPfzText: {
    ...Typography.micro,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 11,
  },
});

export default FishingZoneOverlay;
