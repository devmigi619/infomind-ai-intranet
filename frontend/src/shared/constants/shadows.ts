import { Platform, ViewStyle } from 'react-native';

const webShadow = (val: string): ViewStyle => ({ boxShadow: val }) as any;

const nativeShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  color = '#000',
): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Math.ceil(radius / 2),
});

export const shadows = {
  sm: Platform.select({
    web: webShadow('0 1px 2px rgba(0,0,0,0.04)'),
    default: nativeShadow(1, 2, 0.04),
  }) as ViewStyle,
  md: Platform.select({
    web: webShadow('0 2px 8px rgba(0,0,0,0.04)'),
    default: nativeShadow(2, 8, 0.04),
  }) as ViewStyle,
  lg: Platform.select({
    web: webShadow('0 2px 12px rgba(10,36,99,0.08)'),
    default: nativeShadow(2, 12, 0.08, '#0A2463'),
  }) as ViewStyle,
  dropdown: Platform.select({
    web: webShadow('0 8px 24px rgba(0,0,0,0.10)'),
    default: nativeShadow(8, 24, 0.1),
  }) as ViewStyle,
};
