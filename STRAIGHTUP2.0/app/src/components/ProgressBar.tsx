import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface ProgressBarProps {
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = colors.primary,
  trackColor = colors.border,
  height = 8,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
