/**
 * FishingZoneOverlay — Renders fishing zone polygons on map
 */

import React from 'react';
import { Polygon, Marker } from 'react-native-maps';
import { Colors } from '../../theme';
import type { FishingZone } from '../../data/mockZones';

interface FishingZoneOverlayProps {
  zones: FishingZone[];
  onZonePress?: (zone: FishingZone) => void;
}

const FishingZoneOverlay: React.FC<FishingZoneOverlayProps> = ({
  zones,
  onZonePress,
}) => {
  return (
    <>
      {zones.map((zone) => (
        <React.Fragment key={zone.id}>
          <Polygon
            coordinates={zone.coordinates}
            fillColor="rgba(15, 166, 136, 0.25)"
            strokeColor={Colors.primaryAccent}
            strokeWidth={2}
            tappable
            onPress={() => onZonePress?.(zone)}
          />
          <Marker
            coordinate={zone.center}
            title={zone.name}
            description={`${zone.potential}% Potential • ${zone.sectorCode}`}
            pinColor={Colors.primaryAccent}
            onPress={() => onZonePress?.(zone)}
          />
        </React.Fragment>
      ))}
    </>
  );
};

export default FishingZoneOverlay;
