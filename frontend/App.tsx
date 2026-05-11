import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopHeader } from './src/layout/TopHeader';
import { NavRail } from './src/layout/NavRail';
import { NavRailMorePopover } from './src/layout/NavRailMorePopover';
import { NavRailCustomizationModal } from './src/layout/NavRailCustomizationModal';
import { LeftPanel } from './src/layout/LeftPanel';
import { RightPanel } from './src/layout/RightPanel';
import { MobileApp } from './src/layout/mobile/MobileApp';
import { useUiStore, selectPinnedForMode } from './src/store/uiStore';
import { useCurrentUser, useLogin, useLogout } from './src/features/auth/api';
import { usePushNotifications } from './src/shared/hooks/usePushNotifications';
import { useResponsive } from './src/shared/hooks/useResponsive';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { MainScreen } from './src/features/chat/screens/MainScreen';
import { BoardScreen } from './src/features/board/screens/BoardScreen';
import { ApprovalScreen } from './src/features/approval/screens/ApprovalScreen';
import { WeeklyReportScreen } from './src/features/report/screens/WeeklyReportScreen';
import { PlaceholderScreen } from './src/features/placeholder/screens/PlaceholderScreen';
import { SettingsScreen } from './src/features/settings/screens/SettingsScreen';
import { AdminCommonCodeScreen } from './src/features/admin-common-code/screens/AdminCommonCodeScreen';
import { AdminJobGradeScreen } from './src/features/admin-job-grade/screens/AdminJobGradeScreen';
import { AdminDeptScreen } from './src/features/admin-dept/screens/AdminDeptScreen';
import { AdminUsersScreen } from './src/features/admin-users/screens/AdminUsersScreen';
import { AdminBoardsScreen } from './src/features/admin-boards/screens/AdminBoardsScreen';
import { ConfirmProvider } from './src/shared/hooks/useConfirm';
import type { PanelId } from './src/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60, // 1분
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}

const PLACEHOLDER_TITLES: Record<PanelId, string> = {
  board: '게시판',
  approval: '전자결재',
  report: '주간보고',
  calendar: '캘린더',
  meeting: '회의실',
  vehicle: '차량 예약',
  contacts: '주소록',
  documents: '자료실',
  certificate: '증명서',
  'admin-users': '사용자 관리',
  'admin-roles': '권한 관리',
  'admin-boards': '게시판 관리',
  'admin-approval-line': '결재선 템플릿',
  'admin-common-code': '공통코드 관리',
  'admin-job-grade': '직급 관리',
  'admin-dept': '부서 관리',
  'admin-system': '시스템 설정',
  settings: '설정',
  'menu-panel': '메뉴',
};

function AppContent() {
  const [morePopoverOpen, setMorePopoverOpen] = useState(false);
  const [moreAnchorTop, setMoreAnchorTop] = useState(0);
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      body { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
    `;
    document.head.appendChild(style);
  }, []);

  const { data: user, isLoading } = useCurrentUser();
  const isLoggedIn = !!user;
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  usePushNotifications(isLoggedIn);

  const {
    activePanel,
    activeFullScreen,
    isRightPanelOpen,
    rpTab,
    isAdminMode,
    hasUnreadAi,
    isCustomizationOpen,
    setRpTab,
    handleNavClick,
    openFullScreen,
    openSettingsScreen,
    goHome,
    closeLeftPanel,
    toggleRightPanel,
    toggleAdminMode,
    markAiUnread,
    setCustomizationOpen,
  } = useUiStore();
  const pinnedMenus = useUiStore(selectPinnedForMode);

  // 로그인된 사용자 전환 시 그 사용자 키에서 hydrate
  useEffect(() => {
    if (user?.userId) {
      useUiStore.getState().hydrateFromStorage(user.userId);
    }
  }, [user?.userId]);

  const handleSettingsClick = () => openSettingsScreen();

  const handleLogin = async (userId: string, password: string) => {
    await loginMutation.mutateAsync({ userId, password });
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    useUiStore.getState().resetUiToDefaults();
  };

  const handleNavigate = (target: string) => {
    const knownPanels: PanelId[] = [
      'board',
      'approval',
      'report',
      'calendar',
      'meeting',
      'vehicle',
      'contacts',
      'documents',
      'certificate',
    ];
    if ((knownPanels as string[]).includes(target)) {
      handleNavClick(target as PanelId);
    }
  };

  const handleAiResponseComplete = () => {
    if (!isRightPanelOpen || rpTab !== 'ai') {
      markAiUnread();
    }
  };

  const renderMain = () => {
    if (!activeFullScreen) {
      return (
        <MainScreen
          user={user ?? null}
          onNavigate={handleNavigate}
          onAiResponseComplete={handleAiResponseComplete}
        />
      );
    }
    switch (activeFullScreen) {
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
      default:
        return (
          <PlaceholderScreen title={PLACEHOLDER_TITLES[activeFullScreen] ?? activeFullScreen} />
        );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A2463" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaProvider>
    );
  }

  // Mobile layout
  if (isMobile && user) {
    return (
      <>
        <StatusBar style="dark" />
        <MobileApp
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />

        {/* Top Header */}
        <TopHeader
          user={user ?? null}
          onBrandClick={goHome}
          onLogout={handleLogout}
          onSettingsClick={handleSettingsClick}
          onToggleRightPanel={toggleRightPanel}
          isRightPanelOpen={isRightPanelOpen}
          isAdminMode={isAdminMode}
          onToggleAdminMode={toggleAdminMode}
          hasUnreadAi={hasUnreadAi}
        />

        {/* Body: NavRail + LeftPanel + Main + RightPanel */}
        <View style={styles.body}>
          <NavRail
            activePanel={activePanel}
            activeFullScreen={activeFullScreen}
            isAdminMode={isAdminMode}
            pinnedMenus={pinnedMenus}
            onPanelClick={handleNavClick}
            onMoreClick={(top) => {
              setMoreAnchorTop(top);
              setMorePopoverOpen(true);
            }}
          />

          <NavRailMorePopover
            isOpen={morePopoverOpen}
            onClose={() => setMorePopoverOpen(false)}
            anchorTop={moreAnchorTop}
            pinnedMenus={pinnedMenus}
            onMenuClick={(panel) => {
              handleNavClick(panel);
              setMorePopoverOpen(false);
            }}
            onCustomize={() => {
              setMorePopoverOpen(false);
              setCustomizationOpen(true);
            }}
          />

          <NavRailCustomizationModal
            isOpen={isCustomizationOpen}
            onClose={() => setCustomizationOpen(false)}
          />

          <LeftPanel
            activePanel={activePanel}
            onClose={closeLeftPanel}
            onOpenFullScreen={openFullScreen}
          />

          <View style={styles.mainContent}>{renderMain()}</View>

          <RightPanel
            isOpen={isRightPanelOpen}
            rpTab={rpTab}
            onTabChange={setRpTab}
            userId={user?.id ?? ''}
            hasUnreadAi={hasUnreadAi}
          />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
