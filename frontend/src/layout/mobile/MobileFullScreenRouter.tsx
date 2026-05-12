import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useUiStore } from '../../store/uiStore';
import { useTheme } from '../../shared/hooks/useTheme';
import { useMenuList } from '../../shared/hooks/useMenuList';
import { BoardScreen } from '../../features/board/screens/BoardScreen';
import { ApprovalScreen } from '../../features/approval/screens/ApprovalScreen';
import { WeeklyReportScreen } from '../../features/report/screens/WeeklyReportScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { PlaceholderScreen } from '../../features/placeholder/screens/PlaceholderScreen';
import { AdminCommonCodeScreen } from '../../features/admin-common-code/screens/AdminCommonCodeScreen';
import { AdminJobGradeScreen } from '../../features/admin-job-grade/screens/AdminJobGradeScreen';
import { AdminDeptScreen } from '../../features/admin-dept/screens/AdminDeptScreen';
import { AdminUsersScreen } from '../../features/admin-users/screens/AdminUsersScreen';
import { AdminBoardsScreen } from '../../features/admin-boards/screens/AdminBoardsScreen';
import { MobileMenuPanel } from './MobileMenuPanel';

/** panelId → 실제 화면 컴포넌트 맵 (구현 완료된 패널만 등록) */
const SCREEN_MAP: Record<string, React.ReactElement> = {
  board: <BoardScreen />,
  approval: <ApprovalScreen />,
  report: <WeeklyReportScreen />,
  settings: <SettingsScreen />,
  'common-code': <AdminCommonCodeScreen />,
  'job-grade': <AdminJobGradeScreen />,
  dept: <AdminDeptScreen />,
  users: <AdminUsersScreen />,
  boards: <AdminBoardsScreen />,
  'menu-panel': <MobileMenuPanel />,
};

const BOTTOM_TAB_HEIGHT = 64;
const MOBILE_HEADER_HEIGHT = 56;

export function MobileFullScreenRouter() {
  const activeFullScreen = useUiStore((s) => s.activeFullScreen);
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const menus = useMenuList();

  const visible = activeFullScreen !== null;
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 1)).current;

  // 닫힘 애니메이션 중에도 마지막 화면을 보존
  const [renderedScreen, setRenderedScreen] = useState(activeFullScreen);

  useEffect(() => {
    if (visible) {
      setRenderedScreen(activeFullScreen);
      setMounted(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setMounted(false);
        setRenderedScreen(null);
      });
    }
  }, [visible, activeFullScreen, slideAnim]);

  if (!mounted) return null;

  // 슬라이드 거리: 부모(body) 영역 높이만큼 — body 안에 absolute fill이라 부모 boundary 안에서만 움직임
  const sheetAreaHeight = screenHeight - MOBILE_HEADER_HEIGHT - BOTTOM_TAB_HEIGHT;
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetAreaHeight],
  });

  const renderContent = () => {
    if (!renderedScreen) return null;

    const screen = SCREEN_MAP[renderedScreen];
    if (screen) return screen;

    // 구현 전 패널 — DB의 menuNm을 타이틀로 사용
    const title = menus.find((m) => m.panel === renderedScreen)?.label ?? renderedScreen;
    return <PlaceholderScreen title={title} />;
  };

  return (
    /* Sheet — 부모(body) 영역 안 absolute fill, 슬라이드업으로 등장 */
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.app,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {renderContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 부모(body) 영역 안 absolute fill — body의 overflow:hidden + flex:1이 boundary
  // 'fixed'는 viewport 기준이라 부모 boundary 무시함. 반드시 'absolute'.
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
