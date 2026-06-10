import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { ArrowRight, X } from 'lucide-react-native';
import type { PanelId } from '../types';
import { useTheme } from '../shared/hooks/useTheme';
import { useMenuList } from '../shared/hooks/useMenuList';
import { BoardQuickPanel } from '../features/board/components/BoardQuickPanel';
import { VehicleQuickPanel } from '../features/vehicle/components/VehicleQuickPanel';
import { MtgrQuickPanel } from '../features/mtgr/components/MtgrQuickPanel';
import { LeaveReqQuickPanel } from '../features/leave-req/components/LeaveReqQuickPanel';
import { CalendarQuickPanel } from '../features/calendar/components/CalendarQuickPanel';
import { ReportQuickPanel } from '../features/report/components/ReportQuickPanel';

// ─── 실데이터 QuickPanel 레지스트리 ──────────────────────────────────────────
// 이 맵에 등록된 패널은 표준 헤더/빈 상태를 우회하고 자체 UI를 렌더합니다.
// 새 패널 추가 시 import 후 여기에 한 줄만 추가하면 됩니다.
const QUICK_PANEL_MAP: Partial<Record<PanelId, React.ComponentType<{ onClose: () => void }>>> = {
  board:      BoardQuickPanel,
  vehicle:    VehicleQuickPanel,
  meeting:    MtgrQuickPanel,
  'leave-req': LeaveReqQuickPanel,
  calendar:   CalendarQuickPanel,
  report:     ReportQuickPanel,
};

interface LeftPanelProps {
  activePanel: PanelId | null;
  onClose: () => void;
  onOpenFullScreen: () => void;
}

export function LeftPanel({ activePanel, onClose, onOpenFullScreen }: LeftPanelProps) {
  const widthAnim = useRef(new Animated.Value(activePanel ? 360 : 0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const lastPanelRef = useRef<PanelId | null>(activePanel);
  const theme = useTheme();
  const menus = useMenuList();

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: activePanel ? 360 : 0,
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [activePanel, widthAnim]);

  useEffect(() => {
    if (!activePanel) return;
    if (lastPanelRef.current !== activePanel) {
      fadeAnim.setValue(0);
      translateAnim.setValue(6);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
      lastPanelRef.current = activePanel;
    } else {
      fadeAnim.setValue(1);
      translateAnim.setValue(0);
    }
  }, [activePanel, fadeAnim, translateAnim]);

  // DB 메뉴 테이블에서만 타이틀 조회 — 없으면 빈 문자열
  const title = activePanel
    ? (menus.find((m) => m.panel === activePanel)?.label ?? '')
    : '';

  // 레지스트리에 등록된 패널은 자체 헤더·콘텐츠를 렌더 (표준 레이아웃 우회)
  const QuickPanel = activePanel ? (QUICK_PANEL_MAP[activePanel] ?? null) : null;

  return (
    <Animated.View
      style={{
        borderRightWidth: 1,
        overflow: 'hidden',
        width: widthAnim,
        backgroundColor: theme.bg.surface,
        borderRightColor: theme.border.default,
      }}
    >
      <View
        className="flex-1 flex-col"
        style={{ width: 360 }}
      >
        {QuickPanel ? (
          // ── 실데이터 패널: 자체 UI 전체 위임 ──────────────────────────────
          <Animated.View
            className="flex-1"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            }}
          >
            <QuickPanel onClose={onClose} />
          </Animated.View>
        ) : (
          // ── 미연동 패널: 표준 헤더 + 빈 상태 ─────────────────────────────
          <>
            <View
              className="flex-row items-center justify-between px-4 py-3 border-b"
              style={{ borderBottomColor: theme.border.subtle }}
            >
              <Text
                className="font-medium"
                style={{
                  fontSize: 14,
                  color: theme.text.primary,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                {title}
              </Text>
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <TouchableOpacity
                  onPress={onOpenFullScreen}
                  className="flex-row items-center px-3 py-1.5 rounded-[6px]"
                  style={{ gap: 4, backgroundColor: theme.brand.primaryTint }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="font-medium"
                    style={{
                      fontSize: 12,
                      color: theme.brand.primary,
                      fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                    }}
                  >
                    열기
                  </Text>
                  <ArrowRight size={12} color={theme.brand.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-7 h-7 items-center justify-center rounded-[6px]"
                  activeOpacity={0.7}
                >
                  <X size={14} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View
              className="flex-1"
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              }}
            >
              <View className="flex-1 items-center justify-center">
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.text.muted,
                    fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                  }}
                >
                  데이터가 존재하지 않습니다.
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </Animated.View>
  );
}
