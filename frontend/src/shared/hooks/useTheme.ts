import { useColorScheme } from 'react-native';
import { useUiStore } from '../../store/uiStore';
import { lightTheme, darkTheme, adminAccent, ThemePalette } from '../constants/themes';

export interface AppTheme extends ThemePalette {
  mode: 'light' | 'dark';
  isAdmin: boolean;
}

export function useTheme(): AppTheme {
  const themePreference = useUiStore((s) => s.themePreference);
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const systemScheme = useColorScheme();

  // 1. 모드 결정
  const mode: 'light' | 'dark' =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  // 2. 베이스 팔레트
  const base = mode === 'dark' ? darkTheme : lightTheme;

  // 3. 관리자 액센트 적용 (brand만 빨간으로 교체)
  if (isAdminMode) {
    const accent = adminAccent[mode];
    return {
      ...base,
      mode,
      isAdmin: true,
      brand: {
        primary: accent.primary,
        primaryTint: accent.primaryTint,
        primaryTintSoft: accent.primaryTintSoft,
      },
    };
  }

  return { ...base, mode, isAdmin: false };
}
