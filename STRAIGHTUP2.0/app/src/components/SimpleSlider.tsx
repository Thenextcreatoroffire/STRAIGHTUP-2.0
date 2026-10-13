import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface SimpleSliderProps {
  value: number; // 0..1
  onChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
}

/**
 * Minimal dependency-free slider (0..1) built on PanResponder, so we don't
 * need to add @react-native-community/slider as an extra native dependency
 * just for one control.
 */
export const SimpleSlider: React.FC<SimpleSliderProps> = ({ value, onChange, onSlidingComplete }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const clampFromEvent = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const w = widthRef.current || 1;
    return Math.max(0, Math.min(1, x / w));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: e => {
        onChange(clampFromEvent(e));
      },
      onPanResponderGrant: e => {
        onChange(clampFromEvent(e));
      },
      onPanResponderRelease: e => {
        const v = clampFromEvent(e);
        onChange(v);
        onSlidingComplete?.(v);
      },
    }),
  ).current;

  const knobLeft = trackWidth * Math.max(0, Math.min(1, value));

  return (
    <View style={styles.wrapper} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: knobLeft }]} />
      </View>
      <View style={[styles.knob, { left: Math.max(0, knobLeft - 10) }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  knob: {
    position: 'absolute',
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
