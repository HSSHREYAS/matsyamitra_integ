/**
 * PillToggle — Animated segmented pill toggle
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../../theme';

interface PillToggleProps {
  options: string[];
  activeIndex: number;
  onToggle: (index: number) => void;
  activeColor?: string;
  inactiveTextColor?: string;
}

const PillToggle: React.FC<PillToggleProps> = ({
  options,
  activeIndex,
  onToggle,
  activeColor = Colors.primaryAccent,
  inactiveTextColor = Colors.textSubtleOnDark,
}) => {
  const animatedValue = React.useRef(new Animated.Value(activeIndex)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: activeIndex,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeIndex, animatedValue]);

  const sliderLeft = animatedValue.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => `${(i / options.length) * 100}%`),
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.slider,
          {
            backgroundColor: activeColor,
            width: `${100 / options.length}%`,
            left: sliderLeft,
          },
        ]}
      />
      {options.map((option, index) => (
        <TouchableOpacity
          key={option}
          style={styles.option}
          onPress={() => onToggle(index)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.optionText,
              {
                color:
                  activeIndex === index
                    ? Colors.textOnDark
                    : inactiveTextColor,
              },
            ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.dividerLight,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  slider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: BorderRadius.pill,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    ...Typography.label,
    fontWeight: '600',
  },
});

export default PillToggle;
