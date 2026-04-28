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
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import type { PanelId } from '../types';
import { ALL_MENUS } from '../shared/constants/menus';

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

  // 핀 되지 않은 메뉴들만 표시
  const unpinnedMenus = ALL_MENUS.filter((m) => !pinnedMenus.includes(m.panel));

  return (
    <>
      {/* 외부 클릭 닫힘용 투명 backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Popover 본체 */}
      <View style={[styles.popover, { top: anchorTop }]}>
        <Text style={styles.header}>전체 메뉴</Text>

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
                <Icon size={16} color="rgba(0,0,0,0.5)" />
                <Text style={styles.itemText}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.footer} onPress={onCustomize} activeOpacity={0.8}>
          <View style={styles.footerLeft}>
            <Settings size={13} color="#0A2463" />
            <Text style={styles.footerText}>맞춤설정</Text>
          </View>
          <ChevronRight size={14} color="#0A2463" />
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    zIndex: 100,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.45)',
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
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#0A2463',
  },
});
