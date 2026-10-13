import { TextStyle } from 'react-native';
import { colors } from './colors';

type TypeStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'color'>;

export const typography: Record<string, TypeStyle> = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21, color: colors.textPrimary },
  bodyBold: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18, color: colors.textMuted },
  captionBold: { fontSize: 13, fontWeight: '600', lineHeight: 18, color: colors.textMuted },
  statValue: { fontSize: 24, fontWeight: '700', lineHeight: 30, color: colors.textPrimary },
  buttonLabel: { fontSize: 16, fontWeight: '700', lineHeight: 20, color: colors.white },
};
