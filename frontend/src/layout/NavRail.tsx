import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, FileText, MoreHorizontal } from 'lucide-react-native';
import type { PanelId } from '../types';
import { MENU_ICON_MAP } from '../shared/constants/menus';
import { useMenuList } from '../shared/hooks/useMenuList';
import { useTheme } from '../shared/hooks/useTheme';

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
  const menus = useMenuList();

  const handleMorePress = () => {
    moreButtonRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      onMoreClick(pageY);
    });
  };

  // 일반/관리자 모드 모두 [홈 + 핀 + 더보기] 패턴으로 통일
  return (
    <View
      className="items-center"
      style={{
        width: 64,
        borderRightWidth: 1,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
        backgroundColor: theme.bg.surface,
        borderRightColor: theme.border.default,
      }}
    >
      {/* 홈 (항상 고정) */}
      <TouchableOpacity
        onPress={() => onPanelClick('home')}
        className="items-center justify-center rounded-xl relative"
        style={{
          width: 48,
          height: 48,
          backgroundColor: isHomeActive ? theme.brand.primaryTint : 'transparent',
        }}
        activeOpacity={0.7}
      >
        {isHomeActive && (
          <View
            className="absolute"
            style={{
              left: -8,
              top: 12,
              bottom: 12,
              width: 2,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
              backgroundColor: theme.brand.primary,
            }}
          />
        )}
        <Home size={22} color={isHomeActive ? theme.brand.primary : theme.text.muted} />
      </TouchableOpacity>

      <View
        style={{
          width: 32,
          height: 1,
          marginVertical: 4,
          backgroundColor: theme.border.default,
        }}
      />

      {/* 핀 된 메뉴들 */}
      {pinnedMenus.map((panelId) => {
        const meta = menus.find((m) => m.panel === panelId);
        if (!meta) return null;
        const Icon = MENU_ICON_MAP[meta.iconName] ?? FileText;
        const isActive = activePanel === panelId || activeFullScreen === panelId;
        const unread = panelId === 'approval' ? 2 : 0;

        return (
          <TouchableOpacity
            key={panelId}
            onPress={() => onPanelClick(panelId)}
            className="items-center justify-center rounded-xl relative"
            style={{
              width: 48,
              height: 48,
              backgroundColor: isActive ? theme.brand.primaryTint : 'transparent',
            }}
            activeOpacity={0.7}
          >
            {isActive && (
              <View
                className="absolute"
                style={{
                  left: -8,
                  top: 12,
                  bottom: 12,
                  width: 2,
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: theme.brand.primary,
                }}
              />
            )}
            <Icon size={22} color={isActive ? theme.brand.primary : theme.text.muted} />
            {unread > 0 && (
              <View
                className="absolute items-center justify-center px-1"
                style={{
                  top: 6,
                  right: 6,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#EF4444',
                }}
              >
                <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '600' }}>
                  {unread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* [⋯] 더보기 버튼 */}
      <View ref={moreButtonRef}>
        <TouchableOpacity
          onPress={handleMorePress}
          className="items-center justify-center rounded-xl relative"
          style={{ width: 48, height: 48 }}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={20} color={theme.text.subtle} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
