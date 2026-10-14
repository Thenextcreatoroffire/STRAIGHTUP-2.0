import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography } from '../theme';

interface MetricRowProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  sublabel?: string;
  last?: boolean;
}

export const MetricRow: React.FC<MetricRowProps> = ({
  icon,
  label,
  value,
  valueColor = colors.textPrimary,
  sublabel,
  last = false,
}) => {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.labelWrap}>
        <Text style={typography.body}>{label}</Text>
        {sublabel ? <Text style={typography.caption}>{sublabel}</Text> : null}
      </View>
      <Text style={[typography.bodyBold, { color: valueColor }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  labelWrap: {
    flex: 1,
  },
});
