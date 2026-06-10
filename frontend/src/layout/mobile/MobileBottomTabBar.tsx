import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
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
        className="h-16 border-t flex-row items-center z-[100]"
        style={{
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border.default,
        }}
      >
        {/* Home tab (fixed 1st slot) */}
        <TouchableOpacity
          className="flex-1 items-center justify-center gap-1 h-full relative overflow-hidden"
          style={isHomeActive ? { backgroundColor: theme.brand.primaryTint } : undefined}
          activeOpacity={0.7}
          onPress={handleHomePress}
        >
          {isHomeActive && (
            <View
              className="absolute top-0 left-3 right-3 h-0.5 rounded-b-[2px]"
              style={{ backgroundColor: theme.brand.primary }}
            />
          )}
          <Home
            size={22}
            color={isHomeActive ? theme.brand.primary : theme.text.muted}
          />
          <Text
            className="text-[11px]"
            style={{
              color: isHomeActive ? theme.brand.primary : theme.text.muted,
              fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
            }}
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
              className="flex-1 items-center justify-center gap-1 h-full relative overflow-hidden"
              style={isActive ? { backgroundColor: theme.brand.primaryTint } : undefined}
              activeOpacity={0.7}
              onPress={() => handleTabPress(panelId)}
            >
              {isActive && (
                <View
                  className="absolute top-0 left-3 right-3 h-0.5 rounded-b-[2px]"
                  style={{ backgroundColor: theme.brand.primary }}
                />
              )}
              <Icon size={22} color={color} />
              <Text
                className="text-[11px]"
                style={{
                  color,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* More button (fixed 5th slot) — 메뉴 패널 풀뷰 또는 핀 안 된 메뉴 풀뷰일 때 active */}
        <TouchableOpacity
          className="flex-1 items-center justify-center gap-1 h-full relative overflow-hidden"
          style={isMoreActive ? { backgroundColor: theme.brand.primaryTint } : undefined}
          activeOpacity={0.7}
          onPress={handleMorePress}
        >
          {isMoreActive && (
            <View
              className="absolute top-0 left-3 right-3 h-0.5 rounded-b-[2px]"
              style={{ backgroundColor: theme.brand.primary }}
            />
          )}
          <MoreHorizontal
            size={22}
            color={isMoreActive ? theme.brand.primary : theme.text.muted}
          />
          <Text
            className="text-[11px]"
            style={{
              color: isMoreActive ? theme.brand.primary : theme.text.muted,
              fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
            }}
          >
            더보기
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
