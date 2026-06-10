import React from 'react';
import { View, Text, Platform } from 'react-native';
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
    <View className="gap-1.5">
      {label && (
        <Text
          className="text-xs font-medium"
          style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
        >
          {label}
          {required && <Text className="text-red-500"> *</Text>}
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
        style={{
          height: 40,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          borderColor: theme.border.default,
          backgroundColor: disabled ? theme.bg.surfaceAlt : theme.bg.surface,
        }}
        // ── 텍스트 스타일 ────────────────────────────────────────────
        placeholderStyle={{ fontSize: 13, color: theme.text.muted }}
        selectedTextStyle={{ fontSize: 13, color: theme.text.primary }}
        itemTextStyle={{ fontSize: 13, color: theme.text.primary }}
        inputSearchStyle={{
          height: 36,
          fontSize: 13,
          borderRadius: 6,
          color: theme.text.primary,
          borderColor: theme.border.subtle,
        }}
        // ── 드롭다운 목록 컨테이너 ───────────────────────────────────
        containerStyle={{
          borderWidth: 1,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
          ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } as object,
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            },
          }),
        }}
        // ── 선택된 항목 강조 색상 ────────────────────────────────────
        activeColor={theme.brand.primaryTint}
        iconColor={theme.text.muted}
      />
    </View>
  );
}
