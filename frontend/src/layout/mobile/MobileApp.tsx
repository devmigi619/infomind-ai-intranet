import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import { MobileTopHeader } from './MobileTopHeader';
import { MobileMainScreen } from './MobileMainScreen';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { MobileMoreModal } from './MobileMoreModal';
import { MobileFullScreenRouter } from './MobileFullScreenRouter';
import { NavRailCustomizationModal } from '../NavRailCustomizationModal';
import type { User } from '../../features/auth/api';

interface MobileAppProps {
  user: User;
  onLogout: () => void;
  onNavigate: (target: string) => void;
}

export function MobileApp({ user, onLogout }: MobileAppProps) {
  const theme = useTheme();
  const isMobileMoreOpen = useUiStore((s) => s.isMobileMoreOpen);
  const setMobileMoreOpen = useUiStore((s) => s.setMobileMoreOpen);
  const openSettingsScreen = useUiStore((s) => s.openSettingsScreen);
  const isCustomizationOpen = useUiStore((s) => s.isCustomizationOpen);
  const setCustomizationOpen = useUiStore((s) => s.setCustomizationOpen);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.bg.surface }]}
        edges={['top']}
      >
        <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
          {/* Top Header — always visible */}
          <MobileTopHeader
            user={user}
            onLogout={onLogout}
            onSettingsClick={openSettingsScreen}
          />

          {/* Body: 메인 영역 — 풀뷰는 이 안에서만 슬라이드 (헤더/탭바 침범 X) */}
          <View style={styles.body}>
            <MobileMainScreen userName={user.name} />
            {/* 풀뷰 — body 자식, absolute fill로 부모 영역 안에 갇힘 */}
            <MobileFullScreenRouter />
          </View>

          {/* Bottom Tab Bar — always visible */}
          <MobileBottomTabBar />
        </View>

        {/* More Modal — 최상위에서 렌더링 (탭바 위 풀 오버레이) */}
        <MobileMoreModal
          visible={isMobileMoreOpen}
          onClose={() => setMobileMoreOpen(false)}
        />

        {/* NavRail 맞춤설정 모달 — 모바일에서도 시트 형태로 표시 */}
        <NavRailCustomizationModal
          isOpen={isCustomizationOpen}
          onClose={() => setCustomizationOpen(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  body: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
});
