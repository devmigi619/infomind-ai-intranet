import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, FileText, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { selectPinnedForMode, useUiStore } from '../../store/uiStore';
import { MENU_ICON_MAP } from '../../shared/constants/menus';
import { useMenuList } from '../../shared/hooks/useMenuList';
import type { PanelId } from '../../types';

export function MobileBottomTabBar() {
  const theme = useTheme();
  const pinnedMenus = useUiStore(selectPinnedForMode);
  const activeFullScreen = useUiStore((s) => s.activeFullScreen);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const menus = useMenuList();

  // First 3 pinned menus (홈 + 핀3 + 더보기 = 5슬롯)
  const tabMenus = pinnedMenus.slice(0, 3);

  const handleHomePress = () => {
    setActiveFullScreen(null);
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
    // 메뉴 패널 풀뷰 토글 — 이미 열려있으면 홈으로
    if (activeFullScreen === 'menu-panel') {
      setActiveFullScreen(null);
    } else {
      setActiveFullScreen('menu-panel');
    }
  };

  // 핀 안 된 메뉴(더보기 영역의 메뉴)에 들어와있는지 — 풀뷰 위치이지만 사용자에게는 "더보기 영역"
  const isCurrentlyUnpinnedMenu = (panel: PanelId, pinned: PanelId[]): boolean => {
    if (pinned.includes(panel)) return false;
    return menus.some((m) => m.panel === panel);
  };

  const isHomeActive = activeFullScreen === null;
  const isMoreActive =
    activeFullScreen === 'menu-panel' ||
    (activeFullScreen !== null && isCurrentlyUnpinnedMenu(activeFullScreen, pinnedMenus));

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
          const meta = menus.find((m) => m.panel === panelId);
          const Icon = meta ? MENU_ICON_MAP[meta.iconName] ?? FileText : FileText;
          const label = meta?.label ?? panelId;
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

        {/* More button (fixed 5th slot) — 메뉴 패널 풀뷰 또는 핀 안 된 메뉴 풀뷰일 때 active */}
        <TouchableOpacity
          style={[
            styles.tab,
            isMoreActive && { backgroundColor: theme.brand.primaryTint },
          ]}
          activeOpacity={0.7}
          onPress={handleMorePress}
        >
          {isMoreActive && (
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: theme.brand.primary },
              ]}
            />
          )}
          <MoreHorizontal
            size={22}
            color={isMoreActive ? theme.brand.primary : theme.text.muted}
          />
          <Text
            style={[
              styles.label,
              { color: isMoreActive ? theme.brand.primary : theme.text.muted },
            ]}
          >
            더보기
          </Text>
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
    // 모바일 화면 위계: NavRail은 레벨 2 시트(50)보다 위, 레벨 3 모달(200)보다 아래
    zIndex: 100,
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
