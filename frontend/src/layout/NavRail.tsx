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
  LayoutGrid,
  Shield,
  Tag,
  Settings,
  MoreHorizontal,
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

interface NavRailProps {
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isAdminMode: boolean;
  pinnedMenus: PanelId[];
  onPanelClick: (panel: PanelId | 'home') => void;
  onMoreClick: (anchorTop: number) => void;
}

type AdminNavModule = {
  id: PanelId | 'home';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  label: string;
};

const adminModules: AdminNavModule[] = [
  { id: 'admin-home', icon: LayoutGrid, label: '관리자 홈' },
  { id: 'admin-users', icon: Users, label: '사용자 관리' },
  { id: 'admin-roles', icon: Shield, label: '권한 관리' },
  { id: 'admin-categories', icon: Tag, label: '게시판 카테고리' },
  { id: 'admin-approval-line', icon: FileText, label: '결재선 템플릿' },
  { id: 'admin-system', icon: Settings, label: '시스템 설정' },
];

export function NavRail({
  activePanel,
  activeFullScreen,
  isAdminMode,
  pinnedMenus,
  onPanelClick,
  onMoreClick,
}: NavRailProps) {
  const isHomeActive = activePanel === null && activeFullScreen === null;
  const moreButtonRef = React.useRef<View>(null);

  const handleMorePress = () => {
    moreButtonRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      onMoreClick(pageY);
    });
  };

  if (isAdminMode) {
    return (
      <View style={styles.container}>
        {adminModules.map((mod, idx) => {
          const Icon = mod.icon;
          const isHomeButton = mod.id === 'admin-home';
          const isActive = isHomeButton
            ? isHomeActive
            : activePanel === mod.id || activeFullScreen === mod.id;

          return (
            <React.Fragment key={mod.id}>
              <TouchableOpacity
                onPress={() => onPanelClick(isHomeButton ? 'home' : mod.id)}
                style={[styles.iconButton, isActive && styles.iconButtonActive]}
                activeOpacity={0.7}
              >
                {isActive && <View style={styles.activeIndicator} />}
                <Icon size={22} color={isActive ? '#0A2463' : 'rgba(0,0,0,0.55)'} />
              </TouchableOpacity>
              {idx === 0 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  // User mode: home + pinnedMenus + more button
  return (
    <View style={styles.container}>
      {/* 홈 (항상 고정) */}
      <TouchableOpacity
        onPress={() => onPanelClick('home')}
        style={[styles.iconButton, isHomeActive && styles.iconButtonActive]}
        activeOpacity={0.7}
      >
        {isHomeActive && <View style={styles.activeIndicator} />}
        <Home size={22} color={isHomeActive ? '#0A2463' : 'rgba(0,0,0,0.55)'} />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* 핀 된 메뉴들 */}
      {pinnedMenus.map((panelId) => {
        const meta = ALL_MENUS.find((m) => m.panel === panelId);
        if (!meta) return null;
        const Icon = ICON_MAP[meta.iconName] ?? FileText;
        const isActive = activePanel === panelId || activeFullScreen === panelId;
        const unread = panelId === 'approval' ? 2 : 0; // 기존 하드코딩 유지

        return (
          <TouchableOpacity
            key={panelId}
            onPress={() => onPanelClick(panelId)}
            style={[styles.iconButton, isActive && styles.iconButtonActive]}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.activeIndicator} />}
            <Icon size={22} color={isActive ? '#0A2463' : 'rgba(0,0,0,0.55)'} />
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
          <MoreHorizontal size={20} color="rgba(0,0,0,0.45)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.08)',
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
  iconButtonActive: {
    backgroundColor: 'rgba(10,36,99,0.08)',
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#0A2463',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
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
