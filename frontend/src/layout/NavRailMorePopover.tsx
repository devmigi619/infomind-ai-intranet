import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable } from 'react-native';
import {
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  Shield,
  Tag,
  List,
  GraduationCap,
  Network,
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import type { PanelId } from '../types';
import { getMenusForMode } from '../shared/constants/menus';
import { useTheme } from '../shared/hooks/useTheme';
import { useUiStore } from '../store/uiStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  Shield,
  Tag,
  List,
  GraduationCap,
  Network,
  Settings,
};

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
  const unpinnedMenus = getMenusForMode(isAdminMode).filter(
    (m) => !pinnedMenus.includes(m.panel),
  );

  return (
    <>
      {/* 외부 클릭 닫힘용 투명 backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Popover 본체 */}
      <View
        style={[
          styles.popover,
          { top: anchorTop, backgroundColor: theme.bg.surface, borderColor: theme.border.default },
          Platform.OS === 'web'
            ? ({ boxShadow: theme.shadow.modal } as object)
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 8,
              },
        ]}
      >
        <Text style={[styles.header, { color: theme.text.subtle }]}>전체 메뉴</Text>

        <View style={styles.list}>
          {unpinnedMenus.map((meta) => {
            const Icon = ICON_MAP[meta.iconName] ?? FileText;
            return (
              <TouchableOpacity
                key={meta.panel}
                style={styles.item}
                onPress={() => onMenuClick(meta.panel)}
                activeOpacity={0.7}
              >
                <Icon size={16} color={theme.text.muted} />
                <Text style={[styles.itemText, { color: theme.text.primary }]}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        <TouchableOpacity
          style={[styles.footer, { backgroundColor: theme.bg.surfaceAlt, borderTopColor: theme.border.subtle }]}
          onPress={onCustomize}
          activeOpacity={0.8}
        >
          <View style={styles.footerLeft}>
            <Settings size={13} color={theme.brand.primary} />
            <Text style={[styles.footerText, { color: theme.brand.primary }]}>맞춤설정</Text>
          </View>
          <ChevronRight size={14} color={theme.brand.primary} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  popover: {
    position: 'absolute',
    left: 72,
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 100,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: {
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
  },
});
