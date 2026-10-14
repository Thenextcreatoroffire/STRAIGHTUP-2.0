import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: string;
  icon?: string;
  accentColor?: string;
  sublabel?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  icon,
  accentColor = colors.primary,
  sublabel,
}) => {
  return (
    <Card style={styles.tile}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
          <Icon name={icon} size={18} color={accentColor} />
        </View>
      ) : null}
      <Text style={[typography.statValue, { color: accentColor }]}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
      {sublabel ? <Text style={[typography.caption, styles.sublabel]}>{sublabel}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sublabel: {
    marginTop: 2,
  },
});
