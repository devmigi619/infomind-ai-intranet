import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { ArrowRight, X } from 'lucide-react-native';
import type { PanelId } from '../types';
import { useTheme } from '../shared/hooks/useTheme';
import { useMenuList } from '../shared/hooks/useMenuList';
import { BoardQuickPanel } from '../features/board/components/BoardQuickPanel';
import { VehicleQuickPanel } from '../features/vehicle/components/VehicleQuickPanel';

/** DB 메뉴 데이터가 없는 경우를 대비한 폴백 타이틀 맵 */
const PANEL_TITLE_FALLBACK: Partial<Record<PanelId, string>> = {
  board: '게시판',
  approval: '전자결재',
  report: '주간보고',
  calendar: '캘린더',
  meeting: '회의실',
  vehicle: '차량',
  contacts: '주소록',
  documents: '자료실',
  certificate: '증명서',
  users: '사용자 관리',
  roles: '권한 관리',
  boards: '게시판 관리',
  'approval-line': '결재선 템플릿',
  'common-code': '공통코드 관리',
  'job-grade': '직급 관리',
  dept: '부서 관리',
  system: '시스템 설정',
  settings: '설정',
  'menu-panel': '메뉴',
};

interface LeftPanelProps {
  activePanel: PanelId | null;
  onClose: () => void;
  onOpenFullScreen: () => void;
}


type PreviewSection = {
  label: string;
  cards: Array<{
    title: string;
    meta: string;
    status?: { label: string; color: string };
  }>;
};

const PANEL_PREVIEW: Partial<Record<PanelId, PreviewSection[]>> = {
  approval: [
    {
      label: '대기 중',
      cards: [
        {
          title: '연차 신청 4/28',
          meta: '홍길동 · 어제',
          status: { label: '대기', color: '#F59E0B' },
        },
        {
          title: '출장비 정산 - 부산',
          meta: '김철수 · 2일 전',
          status: { label: '대기', color: '#F59E0B' },
        },
      ],
    },
    {
      label: '최근 처리',
      cards: [
        {
          title: '법인카드 사용 보고',
          meta: '박이사 · 4/24',
          status: { label: '승인', color: '#10B981' },
        },
      ],
    },
  ],
  // board는 BoardQuickPanel이 실데이터로 직접 렌더한다 (PANEL_PREVIEW 우회)
  report: [
    {
      label: '내 보고서',
      cards: [
        { title: '4월 4주차 주간보고', meta: '작성 중 · 마감 내일' },
        { title: '4월 3주차 주간보고', meta: '제출 완료 · 4/19' },
      ],
    },
  ],
  calendar: [
    {
      label: '오늘',
      cards: [
        { title: '팀 스탠드업', meta: '10:00 - 10:30' },
        { title: '클라이언트 미팅', meta: '14:00 - 15:00' },
        { title: '1on1 (박이사)', meta: '16:30 - 17:00' },
      ],
    },
  ],
  meeting: [
    {
      label: '오늘 예약',
      cards: [
        { title: '대회의실', meta: '14:00 - 15:00 · 클라이언트' },
        { title: '소회의실 A', meta: '16:30 - 17:00 · 1on1' },
      ],
    },
  ],
  // vehicle 은 VehicleQuickPanel 에서 실데이터로 렌더 (PANEL_PREVIEW 우회)
};

const PLACEHOLDER_SECTIONS: PreviewSection[] = [
  {
    label: '미리보기',
    cards: [
      { title: '곧 제공될 예정입니다', meta: 'Phase 2/3 구현 대상' },
      { title: '기능 준비 중', meta: '관리자에게 문의' },
    ],
  },
];

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

  // DB 메뉴 테이블에서 타이틀 조회, 없으면 fallback
  const title = activePanel
    ? (menus.find((m) => m.panel === activePanel)?.label ?? PANEL_TITLE_FALLBACK[activePanel] ?? activePanel)
    : '';
  const sections = activePanel ? (PANEL_PREVIEW[activePanel] ?? PLACEHOLDER_SECTIONS) : [];

  // 자체 헤더·콘텐츠를 렌더하는 패널 (LP 표준 헤더 우회)
  const useCustomPanel = activePanel === 'board' || activePanel === 'vehicle';

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
        {useCustomPanel ? (
          <Animated.View
            style={[
              styles.contentWrap,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            {activePanel === 'board' && <BoardQuickPanel onClose={onClose} />}
            {activePanel === 'vehicle' && <VehicleQuickPanel onClose={onClose} />}
          </Animated.View>
        ) : (
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
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section) => (
              <View key={section.label}>
                <Text style={[styles.sectionLabel, { color: theme.text.subtle }]}>{section.label}</Text>
                {section.cards.map((card, idx) => (
                  <TouchableOpacity
                    key={`${section.label}-${idx}`}
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.bg.surfaceAlt,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardRow}>
                      <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>
                        {card.title}
                      </Text>
                      {card.status && (
                        <View style={[styles.statusBadge, { backgroundColor: card.status.color }]}>
                          <Text style={styles.statusText}>{card.status.label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardMeta, { color: theme.text.muted }]}>{card.meta}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 4,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
