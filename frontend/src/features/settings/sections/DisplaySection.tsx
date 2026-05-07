import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useUiStore, type ThemePreference } from '../../../store/uiStore';
import { useColorScheme } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템 따라가기' },
];

export function DisplaySection() {
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);
  const systemScheme = useColorScheme();
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const systemLabel = systemScheme === 'dark' ? '다크' : '라이트';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>화면</Text>

      {/* Dark mode row */}
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>다크 모드</Text>
        <View style={styles.optionGroup}>
          {THEME_OPTIONS.map((opt) => {
            const isSelected = themePreference === opt.value;
            const displayLabel =
              opt.value === 'system' ? `${opt.label} (현재: ${systemLabel})` : opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                style={[
                  styles.optionButton,
                  isSelected && { backgroundColor: theme.brand.primaryTint },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: theme.border.strong },
                    isSelected && { borderColor: theme.brand.primary },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.radioDot, { backgroundColor: theme.brand.primary }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: theme.text.muted },
                    isSelected && { color: theme.brand.primary, fontWeight: '500' },
                  ]}
                  numberOfLines={1}
                >
                  {displayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Language row */}
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>언어</Text>
        <View
          style={[
            styles.selectBox,
            {
              borderColor: theme.border.strong,
              backgroundColor: theme.bg.surfaceMute,
            },
          ]}
        >
          <Text style={[styles.selectBoxText, { color: theme.text.muted }]}>한국어</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 24,
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  // 모바일: 라벨 위, 옵션/셀렉트 아래
  fieldRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: WEB_FONT,
    paddingTop: 2,
  },
  optionGroup: {
    gap: 8,
    alignItems: 'flex-start',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    fontSize: 13,
    fontFamily: WEB_FONT,
  },
  selectBox: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 8,
    flexShrink: 0,
  },
  selectBoxText: {
    fontSize: 13,
    fontFamily: WEB_FONT,
  },
});
