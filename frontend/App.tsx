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
import { useUiStore } from './src/store/uiStore';
import { useCurrentUser, useLogin, useLogout } from './src/features/auth/api';
import { usePushNotifications } from './src/shared/hooks/usePushNotifications';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { MainScreen } from './src/features/chat/screens/MainScreen';
import { BoardScreen } from './src/features/board/screens/BoardScreen';
import { ApprovalScreen } from './src/features/approval/screens/ApprovalScreen';
import { WeeklyReportScreen } from './src/features/report/screens/WeeklyReportScreen';
import { PlaceholderScreen } from './src/features/placeholder/screens/PlaceholderScreen';
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
      <AppContent />
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
  'admin-home': '관리자 홈',
  'admin-users': '사용자 관리',
  'admin-roles': '권한 관리',
  'admin-categories': '게시판 카테고리',
  'admin-approval-line': '결재선 템플릿',
  'admin-system': '시스템 설정',
};

function AppContent() {
  const [morePopoverOpen, setMorePopoverOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [moreAnchorTop, setMoreAnchorTop] = useState(0);

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
    pinnedMenus,
    setRpTab,
    handleNavClick,
    openFullScreen,
    goHome,
    closeLeftPanel,
    toggleRightPanel,
    toggleAdminMode,
    markAiUnread,
  } = useUiStore();

  const handleLogin = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
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

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />

        {/* Top Header */}
        <TopHeader
          user={user ?? null}
          onBrandClick={goHome}
          onLogout={handleLogout}
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
            isOpen={customizationOpen}
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
            userName={user?.name ?? ''}
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
