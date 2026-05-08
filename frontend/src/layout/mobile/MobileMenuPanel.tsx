import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  FileText,
  FileCheck,
  Settings,
  LayoutList,
  Shield,
  Tag,
  List,
  GraduationCap,
  Network,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { selectPinnedForMode, useUiStore } from '../../store/uiStore';
import { getMenusForMode } from '../../shared/constants/menus';
import type { PanelId } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
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

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function MobileMenuPanel() {
  const theme = useTheme();
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const pinnedMenus = useUiStore(selectPinnedForMode);
  const previousFullScreen = useUiStore((s) => s.previousFullScreen);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);
  const setCustomizationOpen = useUiStore((s) => s.setCustomizationOpen);

  // 현재 모드의 메뉴 풀에서 핀 안 된 메뉴들만 (더보기 영역)
  const moreMenus = getMenusForMode(isAdminMode).filter(
    (m) => !pinnedMenus.includes(m.panel),
  );
  const sectionLabel = isAdminMode ? '관리자 메뉴' : '서비스';

  const handleMenuPress = (panelId: PanelId) => {
    setActiveFullScreen(panelId);
  };

  const handleCustomizePress = () => {
    setCustomizationOpen(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* Header — 다른 풀뷰와 일관된 타이틀 영역 */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.bg.surface,
            borderBottomColor: theme.border.default,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: WEB_FONT }]}>
          메뉴
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {moreMenus.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
              {sectionLabel}
            </Text>
            <View
              style={[
                styles.menuGroup,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
              ]}
            >
              {moreMenus.map((meta, index) => {
                const Icon = ICON_MAP[meta.iconName] ?? FileText;
                // 직전에 보던 위치였다면 active 시각 (어디에 있었는지 알려줌)
                const isPreviousLocation = previousFullScreen === meta.panel;
                return (
                  <React.Fragment key={meta.panel}>
                    <TouchableOpacity
                      style={[
                        styles.menuRow,
                        isPreviousLocation && { backgroundColor: theme.brand.primaryTint },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleMenuPress(meta.panel)}
                    >
                      <View
                        style={[
                          styles.menuIconBox,
                          { backgroundColor: theme.brand.primaryTint },
                        ]}
                      >
                        <Icon
                          size={18}
                          color={isPreviousLocation ? theme.brand.primary : theme.brand.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.menuLabel,
                          {
                            color: isPreviousLocation ? theme.brand.primary : theme.text.body,
                            fontFamily: WEB_FONT,
                          },
                          isPreviousLocation && styles.menuLabelActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                    {index < moreMenus.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
          설정
        </Text>
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
          ]}
        >
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={handleCustomizePress}
          >
            <View style={[styles.menuIconBox, { backgroundColor: theme.brand.primaryTint }]}>
              <Settings size={18} color={theme.brand.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.body, fontFamily: WEB_FONT }]}>
              맞춤설정
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 8,
  },
  menuGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: {
    fontSize: 15,
    flex: 1,
  },
  menuLabelActive: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
});
