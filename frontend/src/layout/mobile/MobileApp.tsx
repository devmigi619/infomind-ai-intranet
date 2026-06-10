import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import { MobileTopHeader } from './MobileTopHeader';
import { MobileMainScreen } from './MobileMainScreen';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { MobileFullScreenRouter } from './MobileFullScreenRouter';
import { NavRailCustomizationModal } from '../NavRailCustomizationModal';
import type { User } from '../../features/auth/api';

interface MobileAppProps {
  user: User;
  onLogout: () => void;
  onNavigate: (target: string) => void;
}

export function MobileApp({ user, onLogout, onNavigate }: MobileAppProps) {
  const theme = useTheme();
  const openSettingsScreen = useUiStore((s) => s.openSettingsScreen);
  const isCustomizationOpen = useUiStore((s) => s.isCustomizationOpen);
  const setCustomizationOpen = useUiStore((s) => s.setCustomizationOpen);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.bg.surface }}
        edges={['top']}
      >
        <View
          className="flex-1 flex-col"
          style={{ backgroundColor: theme.bg.app }}
        >
          {/* Top Header — always visible */}
          <MobileTopHeader
            user={user}
            onLogout={onLogout}
            onSettingsClick={openSettingsScreen}
          />

          {/* Body: 메인 영역 — 풀뷰는 이 안에서만 슬라이드 (헤더/탭바 침범 X) */}
          <View className="flex-1 relative overflow-hidden">
            <MobileMainScreen user={user} onNavigate={onNavigate} />
            {/* 풀뷰 — body 자식, absolute fill로 부모 영역 안에 갇힘 */}
            <MobileFullScreenRouter />
          </View>

          {/* Bottom Tab Bar — always visible */}
          <MobileBottomTabBar />
        </View>

        {/* NavRail 맞춤설정 모달 — 모바일에서도 시트 형태로 표시 */}
        <NavRailCustomizationModal
          isOpen={isCustomizationOpen}
          onClose={() => setCustomizationOpen(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
