import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useTheme } from '../hooks/useTheme';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export interface DropdownOption {
  value: string;
  label: string;
}

interface AppDropdownProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  search?: boolean;
}

/**
 * 공통 드롭다운 컴포넌트.
 * react-native-element-dropdown 기반, 프로젝트 테마에 맞게 스타일 통일.
 *
 * @example
 * <AppDropdown
 *   label="권한"
 *   required
 *   value={form.userSe}
 *   onChange={v => setForm(f => ({ ...f, userSe: v }))}
 *   options={roleOptions}
 * />
 */
export function AppDropdown({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = '선택',
  disabled = false,
  search = false,
}: AppDropdownProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
          {label}
          {required && <Text style={{ color: '#EF4444' }}> *</Text>}
        </Text>
      )}
      <Dropdown
        data={options}
        labelField="label"
        valueField="value"
        value={value || null}
        onChange={(item) => onChange(item.value)}
        placeholder={placeholder}
        search={search}
        searchPlaceholder="검색..."
        disable={disabled}
        maxHeight={240}
        dropdownPosition="auto"
        fontFamily={WEB_FONT}
        // ── 트리거(버튼) 스타일 ──────────────────────────────────────
        style={[
          styles.trigger,
          {
            borderColor: theme.border.default,
            backgroundColor: disabled ? theme.bg.surfaceAlt : theme.bg.surface,
          },
        ]}
        // ── 텍스트 스타일 ────────────────────────────────────────────
        placeholderStyle={[styles.placeholderText, { color: theme.text.muted }]}
        selectedTextStyle={[styles.selectedText, { color: theme.text.primary }]}
        itemTextStyle={[styles.itemText, { color: theme.text.primary }]}
        inputSearchStyle={[styles.searchInput, { color: theme.text.primary, borderColor: theme.border.subtle }]}
        // ── 드롭다운 목록 컨테이너 ───────────────────────────────────
        containerStyle={[
          styles.container,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
          },
        ]}
        // ── 선택된 항목 강조 색상 ────────────────────────────────────
        activeColor={theme.brand.primaryTint}
        iconColor={theme.text.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },

  trigger: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  placeholderText: { fontSize: 13 },
  selectedText:   { fontSize: 13 },
  itemText:       { fontSize: 13 },

  searchInput: {
    height: 36,
    fontSize: 13,
    borderRadius: 6,
  },

  container: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    // 그림자 (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // 그림자 (Android)
    elevation: 4,
  },
});
