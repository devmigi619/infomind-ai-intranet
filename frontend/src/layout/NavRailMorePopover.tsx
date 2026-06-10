import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Pressable } from 'react-native';
import { FileText, Settings, ChevronRight } from 'lucide-react-native';
import type { PanelId } from '../types';
import { MENU_ICON_MAP } from '../shared/constants/menus';
import { useMenusForMode } from '../shared/hooks/useMenuList';
import { useTheme } from '../shared/hooks/useTheme';
import { useUiStore } from '../store/uiStore';

interface NavRailMorePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorTop: number;
  pinnedMenus: PanelId[];
  onMenuClick: (panel: PanelId) => void;
  onCustomize: () => void;
}

export function NavRailMorePopover({
  isOpen,
  onClose,
  anchorTop,
  pinnedMenus,
  onMenuClick,
  onCustomize,
}: NavRailMorePopoverProps) {
  const theme = useTheme();
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const allMenusForMode = useMenusForMode(isAdminMode);

  // ESC 키로 닫기 (웹 전용)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 핀 되지 않은 메뉴들만 표시 (현재 모드에 맞는 풀에서)
  const unpinnedMenus = allMenusForMode.filter((m) => !pinnedMenus.includes(m.panel));

  return (
    <>
      {/* 외부 클릭 닫힘용 투명 backdrop */}
      <Pressable
        className="absolute top-0 left-0 right-0 bottom-0"
        style={{ zIndex: 99 }}
        onPress={onClose}
      />

      {/* Popover 본체 */}
      <View
        className="absolute overflow-hidden"
        style={{
          left: 72,
          width: 280,
          borderRadius: 12,
          borderWidth: 1,
          zIndex: 100,
          top: anchorTop,
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
          ...(Platform.OS === 'web'
            ? { boxShadow: theme.shadow.modal }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 8,
              }),
        }}
      >
        <Text
          className="uppercase"
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.6,
            color: theme.text.subtle,
          }}
        >
          전체 메뉴
        </Text>

        <View className="py-1">
          {unpinnedMenus.map((meta) => {
            const Icon = MENU_ICON_MAP[meta.iconName] ?? FileText;
            return (
              <TouchableOpacity
                key={meta.panel}
                className="flex-row items-center px-4 py-2.5"
                style={{ gap: 10 }}
                onPress={() => onMenuClick(meta.panel)}
                activeOpacity={0.7}
              >
                <Icon size={16} color={theme.text.muted} />
                <Text style={{ fontSize: 13, color: theme.text.primary }}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={{
            height: 1,
            marginVertical: 4,
            backgroundColor: theme.border.subtle,
          }}
        />

        <TouchableOpacity
          className="flex-row items-center justify-between border-t px-4 py-2.5"
          style={{
            backgroundColor: theme.bg.surfaceAlt,
            borderTopColor: theme.border.subtle,
          }}
          onPress={onCustomize}
          activeOpacity={0.8}
        >
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Settings size={13} color={theme.brand.primary} />
            <Text style={{ fontSize: 12, color: theme.brand.primary }}>
              맞춤설정
            </Text>
          </View>
          <ChevronRight size={14} color={theme.brand.primary} />
        </TouchableOpacity>
      </View>
    </>
  );
}
