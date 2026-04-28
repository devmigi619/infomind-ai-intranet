import { Platform } from 'react-native';

export const fontFamily = Platform.select({
  web: "'Noto Sans KR', sans-serif",
  default: undefined,
});

export const fontSize = {
  caption: 11,
  micro: 12,
  small: 13,
  body: 14,
  bodyLg: 15,
  base: 16,
  heading: 18,
  title: 22,
  display: 28,
};

export const fontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.4,
  normal: 1.5,
  relaxed: 1.6,
};
