import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { FileText, Settings } from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { selectPinnedForMode, useUiStore } from '../../store/uiStore';
import { MENU_ICON_MAP } from '../../shared/constants/menus';
import { useMenusForMode } from '../../shared/hooks/useMenuList';
import type { PanelId } from '../../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function MobileMenuPanel() {
  const theme = useTheme();
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const pinnedMenus = useUiStore(selectPinnedForMode);
  const previousFullScreen = useUiStore((s) => s.previousFullScreen);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const setCustomizationOpen = useUiStore((s) => s.setCustomizationOpen);
  const menusForMode = useMenusForMode(isAdminMode);

  // 현재 모드의 메뉴 풀에서 핀 안 된 메뉴들만 (더보기 영역)
  const moreMenus = menusForMode.filter((m) => !pinnedMenus.includes(m.panel));
  const sectionLabel = isAdminMode ? '관리자 메뉴' : '서비스';

  const handleMenuPress = (panelId: PanelId) => {
    setActiveFullScreen(panelId);
  };

  const handleCustomizePress = () => {
    setCustomizationOpen(true);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg.app }}>
      {/* Header — 다른 풀뷰와 일관된 타이틀 영역 */}
      <View
        className="flex-row items-center justify-center border-b px-5"
        style={{
          height: 56,
          backgroundColor: theme.bg.surface,
          borderBottomColor: theme.border.default,
        }}
      >
        <Text
          className="font-semibold"
          style={{ fontSize: 16, color: theme.text.primary, fontFamily: WEB_FONT }}
        >
          메뉴
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {moreMenus.length > 0 && (
          <>
            <Text
              className="uppercase mb-1 mt-2"
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                color: theme.text.subtle,
                fontFamily: WEB_FONT,
              }}
            >
              {sectionLabel}
            </Text>
            <View
              className="border overflow-hidden mb-1 rounded-xl"
              style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
            >
              {moreMenus.map((meta, index) => {
                const Icon = MENU_ICON_MAP[meta.iconName] ?? FileText;
                // 직전에 보던 위치였다면 active 시각 (어디에 있었는지 알려줌)
                const isPreviousLocation = previousFullScreen === meta.panel;
                return (
                  <React.Fragment key={meta.panel}>
                    <TouchableOpacity
                      className="flex-row items-center px-4 py-3.5"
                      style={{
                        gap: 12,
                        backgroundColor: isPreviousLocation ? theme.brand.primaryTint : 'transparent',
                      }}
                      activeOpacity={0.7}
                      onPress={() => handleMenuPress(meta.panel)}
                    >
                      <View
                        className="w-9 h-9 items-center justify-center shrink-0 rounded-[9px]"
                        style={{ backgroundColor: theme.brand.primaryTint }}
                      >
                        <Icon
                          size={18}
                          color={theme.brand.primary}
                        />
                      </View>
                      <Text
                        className="flex-1"
                        style={{
                          fontSize: 15,
                          color: isPreviousLocation ? theme.brand.primary : theme.text.body,
                          fontWeight: isPreviousLocation ? '600' : 'normal',
                          fontFamily: WEB_FONT,
                        }}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                    {index < moreMenus.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          marginLeft: 64,
                          backgroundColor: theme.border.subtle,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        <Text
          className="uppercase mb-1 mt-2"
          style={{
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
            color: theme.text.subtle,
            fontFamily: WEB_FONT,
          }}
        >
          설정
        </Text>
        <View
          className="border overflow-hidden mb-1 rounded-xl"
          style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
        >
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5"
            style={{ gap: 12 }}
            activeOpacity={0.7}
            onPress={handleCustomizePress}
          >
            <View
              className="w-9 h-9 items-center justify-center shrink-0 rounded-[9px]"
              style={{ backgroundColor: theme.brand.primaryTint }}
            >
              <Settings size={18} color={theme.brand.primary} />
            </View>
            <Text
              className="flex-1"
              style={{ fontSize: 15, color: theme.text.body, fontFamily: WEB_FONT }}
            >
              맞춤설정
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
