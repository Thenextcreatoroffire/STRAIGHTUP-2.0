import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  small?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  small = false,
}) => {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
      ? colors.danger
      : variant === 'success'
      ? colors.success
      : 'transparent';
  const textColor = variant === 'outline' ? colors.primary : colors.white;
  const border = variant === 'outline' ? { borderWidth: 1.5, borderColor: colors.primary } : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        border,
        variant !== 'outline' && shadow.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.buttonLabel,
              { color: textColor },
              small && styles.smallLabel,
              icon ? styles.labelWithIcon : null,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonSmall: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  smallLabel: {
    fontSize: 14,
  },
  labelWithIcon: {
    marginLeft: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});
