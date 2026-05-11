import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useUiStore } from '../../store/uiStore';
import { useTheme } from '../../shared/hooks/useTheme';
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

const PLACEHOLDER_TITLES: Record<string, string> = {
  calendar: '캘린더',
  meeting: '회의실',
  vehicle: '차량 예약',
  contacts: '주소록',
  documents: '자료실',
  certificate: '증명서',
  'admin-users': '사용자 관리',
  'admin-roles': '권한 관리',
  'admin-boards': '게시판 관리',
  'admin-approval-line': '결재선 관리',
  'admin-common-code': '공통코드 관리',
  'admin-job-grade': '직급 관리',
  'admin-dept': '부서 관리',
  'admin-system': '시스템 설정',
};

const BOTTOM_TAB_HEIGHT = 64;
const MOBILE_HEADER_HEIGHT = 56;

export function MobileFullScreenRouter() {
  const activeFullScreen = useUiStore((s) => s.activeFullScreen);
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();

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
    switch (renderedScreen) {
      case 'board':
        return <BoardScreen />;
      case 'approval':
        return <ApprovalScreen />;
      case 'report':
        return <WeeklyReportScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'admin-common-code':
        return <AdminCommonCodeScreen />;
      case 'admin-job-grade':
        return <AdminJobGradeScreen />;
      case 'admin-dept':
        return <AdminDeptScreen />;
      case 'admin-users':
        return <AdminUsersScreen />;
      case 'admin-boards':
        return <AdminBoardsScreen />;
      case 'menu-panel':
        return <MobileMenuPanel />;
      default:
        return (
          <PlaceholderScreen
            title={PLACEHOLDER_TITLES[renderedScreen] ?? renderedScreen}
          />
        );
    }
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
