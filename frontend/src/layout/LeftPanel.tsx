import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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

// ─── 실데이터 QuickPanel 레지스트리 ──────────────────────────────────────────
// 이 맵에 등록된 패널은 표준 헤더/빈 상태를 우회하고 자체 UI를 렌더합니다.
// 새 패널 추가 시 import 후 여기에 한 줄만 추가하면 됩니다.
const QUICK_PANEL_MAP: Partial<Record<PanelId, React.ComponentType<{ onClose: () => void }>>> = {
  board:      BoardQuickPanel,
  vehicle:    VehicleQuickPanel,
  meeting:    MtgrQuickPanel,
  'leave-req': LeaveReqQuickPanel,
  calendar:   CalendarQuickPanel,
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
      style={[
        styles.container,
        {
          width: widthAnim,
          backgroundColor: theme.bg.surface,
          borderRightColor: theme.border.default,
        },
      ]}
    >
      <View style={styles.inner}>
        {QuickPanel ? (
          // ── 실데이터 패널: 자체 UI 전체 위임 ──────────────────────────────
          <Animated.View
            style={[
              styles.contentWrap,
              { opacity: fadeAnim, transform: [{ translateY: translateAnim }] },
            ]}
          >
            <QuickPanel onClose={onClose} />
          </Animated.View>
        ) : (
          // ── 미연동 패널: 표준 헤더 + 빈 상태 ─────────────────────────────
          <>
            <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onOpenFullScreen}
                  style={[styles.openButton, { backgroundColor: theme.brand.primaryTint }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.openButtonText, { color: theme.brand.primary }]}>열기</Text>
                  <ArrowRight size={12} color={theme.brand.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <X size={14} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View
              style={[
                styles.contentWrap,
                { opacity: fadeAnim, transform: [{ translateY: translateAnim }] },
              ]}
            >
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.text.muted }]}>
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

const styles = StyleSheet.create({
  container: {
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    width: 360,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  contentWrap: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
