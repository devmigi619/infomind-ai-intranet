import { useWindowDimensions } from 'react-native';

const MOBILE_BREAKPOINT = 768;

export function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isDesktop: width >= MOBILE_BREAKPOINT,
    width,
  };
}
