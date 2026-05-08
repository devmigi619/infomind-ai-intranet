import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Home,
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
  Settings,
  MoreHorizontal,
} from 'lucide-react-native';
import type { PanelId } from '../types';
import { ALL_MENUS } from '../shared/constants/menus';
import { useTheme } from '../shared/hooks/useTheme';

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
  Settings,
};

interface NavRailProps {
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isAdminMode: boolean;
  pinnedMenus: PanelId[];
  onPanelClick: (panel: PanelId | 'home') => void;
  onMoreClick: (anchorTop: number) => void;
}

export function NavRail({
  activePanel,
  activeFullScreen,
  pinnedMenus,
  onPanelClick,
  onMoreClick,
}: NavRailProps) {
  const isHomeActive = activePanel === null && activeFullScreen === null;
  const moreButtonRef = React.useRef<View>(null);
  const theme = useTheme();

  const handleMorePress = () => {
    moreButtonRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      onMoreClick(pageY);
    });
  };

  // 일반/관리자 모드 모두 [홈 + 핀 + 더보기] 패턴으로 통일
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.surface,
          borderRightColor: theme.border.default,
        },
      ]}
    >
      {/* 홈 (항상 고정) */}
      <TouchableOpacity
        onPress={() => onPanelClick('home')}
        style={[
          styles.iconButton,
          isHomeActive && { backgroundColor: theme.brand.primaryTint },
        ]}
        activeOpacity={0.7}
      >
        {isHomeActive && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.brand.primary }]} />
        )}
        <Home size={22} color={isHomeActive ? theme.brand.primary : theme.text.muted} />
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: theme.border.default }]} />

      {/* 핀 된 메뉴들 */}
      {pinnedMenus.map((panelId) => {
        const meta = ALL_MENUS.find((m) => m.panel === panelId);
        if (!meta) return null;
        const Icon = ICON_MAP[meta.iconName] ?? FileText;
        const isActive = activePanel === panelId || activeFullScreen === panelId;
        const unread = panelId === 'approval' ? 2 : 0;

        return (
          <TouchableOpacity
            key={panelId}
            onPress={() => onPanelClick(panelId)}
            style={[
              styles.iconButton,
              isActive && { backgroundColor: theme.brand.primaryTint },
            ]}
            activeOpacity={0.7}
          >
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: theme.brand.primary }]} />
            )}
            <Icon size={22} color={isActive ? theme.brand.primary : theme.text.muted} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* [⋯] 더보기 버튼 */}
      <View ref={moreButtonRef}>
        <TouchableOpacity onPress={handleMorePress} style={styles.iconButton} activeOpacity={0.7}>
          <MoreHorizontal size={20} color={theme.text.subtle} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    borderRightWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    top: 12,
    bottom: 12,
    width: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  divider: {
    width: 32,
    height: 1,
    marginVertical: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
});
