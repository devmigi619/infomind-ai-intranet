import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  X,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  FileText,
  Settings,
  LayoutList,
  ShieldCheck,
  List,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import type { PanelId } from '../../types';

interface MenuItem {
  panelId: PanelId;
  label: string;
  Icon: LucideIcon;
}

const REGULAR_MENUS: MenuItem[] = [
  { panelId: 'calendar', label: '캘린더', Icon: Calendar },
  { panelId: 'meeting', label: '회의실', Icon: Building2 },
  { panelId: 'vehicle', label: '차량', Icon: Car },
  { panelId: 'contacts', label: '주소록', Icon: Users },
  { panelId: 'documents', label: '자료실', Icon: BookOpen },
  { panelId: 'certificate', label: '증명서', Icon: FileText },
];

const ADMIN_MENUS: MenuItem[] = [
  { panelId: 'admin-home', label: '관리자 홈', Icon: LayoutList },
  { panelId: 'admin-users', label: '사용자 관리', Icon: Users },
  { panelId: 'admin-roles', label: '권한 관리', Icon: ShieldCheck },
  { panelId: 'admin-common-code', label: '공통코드 관리', Icon: List },
];

// PC NavRailMorePopover와 동일 정신: 작은 드롭다운형 시트
const MOBILE_HEADER_HEIGHT = 56;
const BOTTOM_TAB_HEIGHT = 64;

interface MobileMoreModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MobileMoreModal({ visible, onClose }: MobileMoreModalProps) {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const handleNavClick = useUiStore((s) => s.handleNavClick);
  const setCustomizationOpen = useUiStore((s) => s.setCustomizationOpen);

  // visible과 분리된 mount 상태 — 닫힘 애니메이션 후 unmount
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, slideAnim, opacityAnim]);

  if (!mounted) return null;

  // 작은 시트 — PC 드롭다운 정신: 컨텐츠 높이 자동, 최대 60% 또는 시트 영역 - 여유 40
  const sheetMaxHeight = Math.min(
    screenHeight * 0.6,
    screenHeight - MOBILE_HEADER_HEIGHT - BOTTOM_TAB_HEIGHT - 40,
  );
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetMaxHeight],
  });

  const handleMenuPress = (panelId: PanelId) => {
    handleNavClick(panelId);
    onClose();
  };

  const handleSettingsPress = () => {
    setCustomizationOpen(true);
    onClose();
  };

  const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Backdrop — 어둠 없음 (transparent), 시트 외부 클릭으로 닫힘 영역만 유지 */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: opacityAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet — 슬라이드업, 그림자로 떠있는 느낌 */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.bg.app,
            maxHeight: sheetMaxHeight,
            transform: [{ translateY }],
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 -8px 24px rgba(0,0,0,0.18)' } as object)
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  elevation: 16,
                }),
          },
        ]}
      >
        {/* Header */}
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
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <X size={20} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
            서비스
          </Text>
          <View
            style={[
              styles.menuGroup,
              { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
            ]}
          >
            {REGULAR_MENUS.map((item, index) => (
              <React.Fragment key={item.panelId}>
                <TouchableOpacity
                  style={styles.menuRow}
                  activeOpacity={0.7}
                  onPress={() => handleMenuPress(item.panelId)}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: theme.brand.primaryTint }]}>
                    <item.Icon size={18} color={theme.brand.primary} />
                  </View>
                  <Text style={[styles.menuLabel, { color: theme.text.body, fontFamily: WEB_FONT }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < REGULAR_MENUS.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
                )}
              </React.Fragment>
            ))}
          </View>

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
              onPress={handleSettingsPress}
            >
              <View style={[styles.menuIconBox, { backgroundColor: theme.brand.primaryTint }]}>
                <Settings size={18} color={theme.brand.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.text.body, fontFamily: WEB_FONT }]}>
                맞춤설정
              </Text>
            </TouchableOpacity>
          </View>

          {isAdminMode && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.text.subtle, fontFamily: WEB_FONT }]}>
                관리자
              </Text>
              <View
                style={[
                  styles.menuGroup,
                  { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
                ]}
              >
                {ADMIN_MENUS.map((item, index) => (
                  <React.Fragment key={item.panelId}>
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.7}
                      onPress={() => handleMenuPress(item.panelId)}
                    >
                      <View
                        style={[
                          styles.menuIconBox,
                          { backgroundColor: theme.semanticTint.warning },
                        ]}
                      >
                        <item.Icon size={18} color={theme.semantic.warning} />
                      </View>
                      <Text
                        style={[styles.menuLabel, { color: theme.text.body, fontFamily: WEB_FONT }]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                    {index < ADMIN_MENUS.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 풀 화면 오버레이 — fixed (web) / absolute (native)
  root: {
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed' } as object)
      : { position: 'absolute' }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_TAB_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  scroll: {
    flexGrow: 0,
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
  divider: {
    height: 1,
    marginLeft: 64,
  },
});
