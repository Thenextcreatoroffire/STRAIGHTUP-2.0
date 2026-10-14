import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  value,
  onValueChange,
  last = false,
}) => {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.textWrap}>
        <Text style={typography.body}>{label}</Text>
        {description ? <Text style={typography.caption}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.disabled, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : '#FFFFFF'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
});
