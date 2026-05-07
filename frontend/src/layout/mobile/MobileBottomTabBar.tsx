import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
  MoreHorizontal,
} from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import type { PanelId } from '../../types';

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

const ICON_NAME_MAP: Record<PanelId, string> = {
  board: 'LayoutList',
  approval: 'FileCheck',
  report: 'FileText',
  calendar: 'Calendar',
  meeting: 'Building2',
  vehicle: 'Car',
  contacts: 'Users',
  documents: 'BookOpen',
  certificate: 'FileText',
  'admin-home': 'LayoutList',
  'admin-users': 'Users',
  'admin-roles': 'FileText',
  'admin-categories': 'FileText',
  'admin-approval-line': 'FileText',
  'admin-system': 'FileText',
  settings: 'FileText',
};

const LABEL_MAP: Record<PanelId, string> = {
  board: '게시판',
  approval: '결재',
  report: '주간보고',
  calendar: '캘린더',
  meeting: '회의실',
  vehicle: '차량',
  contacts: '주소록',
  documents: '자료실',
  certificate: '증명서',
  'admin-home': '관리자 홈',
  'admin-users': '사용자',
  'admin-roles': '권한',
  'admin-categories': '카테고리',
  'admin-approval-line': '결재선',
  'admin-system': '시스템',
  settings: '설정',
};

export function MobileBottomTabBar() {
  const theme = useTheme();
  const pinnedMenus = useUiStore((s) => s.pinnedMenus);
  const activeFullScreen = useUiStore((s) => s.activeFullScreen);
  const isMobileMoreOpen = useUiStore((s) => s.isMobileMoreOpen);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const setMobileMoreOpen = useUiStore((s) => s.setMobileMoreOpen);

  // First 3 pinned menus (홈 + 핀3 + 더보기 = 5슬롯)
  const tabMenus = pinnedMenus.slice(0, 3);

  const handleHomePress = () => {
    setActiveFullScreen(null);
    setMobileMoreOpen(false);
  };

  const handleTabPress = (panelId: PanelId) => {
    if (activeFullScreen === panelId) {
      // Same tab re-press = close (go home)
      setActiveFullScreen(null);
    } else {
      // Different tab = open that module
      setActiveFullScreen(panelId);
    }
  };

  const handleMorePress = () => {
    setMobileMoreOpen(true);
  };

  const isHomeActive = activeFullScreen === null && !isMobileMoreOpen;

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg.surface,
            borderTopColor: theme.border.default,
          },
        ]}
      >
        {/* Home tab (fixed 1st slot) */}
        <TouchableOpacity
          style={[
            styles.tab,
            isHomeActive && { backgroundColor: theme.brand.primaryTint },
          ]}
          activeOpacity={0.7}
          onPress={handleHomePress}
        >
          {isHomeActive && (
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: theme.brand.primary },
              ]}
            />
          )}
          <Home
            size={22}
            color={isHomeActive ? theme.brand.primary : theme.text.muted}
          />
          <Text
            style={[
              styles.label,
              { color: isHomeActive ? theme.brand.primary : theme.text.muted },
            ]}
          >
            홈
          </Text>
        </TouchableOpacity>

        {tabMenus.map((panelId) => {
          const iconName = ICON_NAME_MAP[panelId] ?? 'FileText';
          const Icon = ICON_MAP[iconName] ?? FileText;
          const label = LABEL_MAP[panelId] ?? panelId;
          const isActive = activeFullScreen === panelId;
          const color = isActive ? theme.brand.primary : theme.text.muted;

          return (
            <TouchableOpacity
              key={panelId}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.brand.primaryTint },
              ]}
              activeOpacity={0.7}
              onPress={() => handleTabPress(panelId)}
            >
              {isActive && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: theme.brand.primary },
                  ]}
                />
              )}
              <Icon size={22} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* More button (fixed 5th slot) */}
        <TouchableOpacity style={styles.tab} activeOpacity={0.7} onPress={handleMorePress}>
          <MoreHorizontal size={22} color={theme.text.muted} />
          <Text style={[styles.label, { color: theme.text.muted }]}>더보기</Text>
        </TouchableOpacity>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
