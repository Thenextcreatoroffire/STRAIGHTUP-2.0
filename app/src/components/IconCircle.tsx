import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme';

interface IconCircleProps {
  name: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const IconCircle: React.FC<IconCircleProps> = ({
  name,
  size = 48,
  color = colors.primary,
  backgroundColor,
}) => {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? `${color}1A`,
        },
      ]}
    >
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
