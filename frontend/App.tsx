import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TopHeader } from './src/components/TopHeader';
import { NavRail } from './src/components/NavRail';
import { LeftPanel } from './src/components/LeftPanel';
import { RightPanel } from './src/components/RightPanel';
import { usePanel } from './src/hooks/usePanel';
import { useAuth } from './src/hooks/useAuth';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainScreen } from './src/screens/MainScreen';
import { BoardScreen } from './src/screens/BoardScreen';
import { ApprovalScreen } from './src/screens/ApprovalScreen';
import { WeeklyReportScreen } from './src/screens/WeeklyReportScreen';
import { PlaceholderScreen } from './src/screens/PlaceholderScreen';
import type { PanelId } from './src/types';

const PLACEHOLDER_TITLES: Record<PanelId, string> = {
  board: '게시판',
  approval: '전자결재',
  report: '주간보고',
  calendar: '캘린더',
  meeting: '회의실',
  vehicle: '차량 예약',
  'admin-home': '관리자 홈',
  'admin-users': '사용자 관리',
  'admin-roles': '권한 관리',
  'admin-categories': '게시판 카테고리',
  'admin-approval-line': '결재선 템플릿',
  'admin-system': '시스템 설정',
};

export default function App() {
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

  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  usePushNotifications(isLoggedIn);
  const {
    activePanel,
    activeFullScreen,
    isRightPanelOpen,
    rpTab,
    isAdminMode,
    hasUnreadAi,
    setRpTab,
    handleNavClick,
    openFullScreen,
    goHome,
    closeLeftPanel,
    toggleRightPanel,
    toggleAdminMode,
    markAiUnread,
  } = usePanel();

  const handleNavigate = (target: string) => {
    // Quick action navigation from MainScreen — promote to fullscreen if known
    const knownPanels: PanelId[] = [
      'board',
      'approval',
      'report',
      'calendar',
      'meeting',
      'vehicle',
    ];
    if ((knownPanels as string[]).includes(target)) {
      // Open the panel preview in LeftPanel
      handleNavClick(target as PanelId);
    }
  };

  const handleAiResponseComplete = () => {
    // Per UX rule: never auto-open RP / auto-switch to AI tab.
    // Only mark unread when the user is not already viewing the AI tab.
    if (!isRightPanelOpen || rpTab !== 'ai') {
      markAiUnread();
    }
  };

  const renderMain = () => {
    if (!activeFullScreen) {
      return (
        <MainScreen
          user={user}
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
          <PlaceholderScreen
            title={PLACEHOLDER_TITLES[activeFullScreen] ?? activeFullScreen}
          />
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
        <LoginScreen onLogin={login} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />

        {/* Top Header */}
        <TopHeader
          user={user}
          onBrandClick={goHome}
          onLogout={logout}
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
            onPanelClick={handleNavClick}
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
