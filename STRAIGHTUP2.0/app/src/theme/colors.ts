/**
 * Central color tokens for StraightUp.
 * Change `primary` (and friends) here to re-theme the whole app.
 */
export const colors = {
  background: '#F6F6FB',
  card: '#FFFFFF',
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#EFECFD',
  success: '#34C759',
  successLight: '#E6F9EC',
  danger: '#FF3B30',
  dangerLight: '#FFEBEA',
  warning: '#FF9F0A',
  warningLight: '#FFF3E0',
  textPrimary: '#1C1C28',
  textMuted: '#8E8E96',
  border: '#ECECF4',
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#2B2B44',
  overlay: 'rgba(28,28,40,0.45)',
  tabInactive: '#B7B7C4',
  disabled: '#D9D9E3',
} as const;

export type ColorToken = keyof typeof colors;
