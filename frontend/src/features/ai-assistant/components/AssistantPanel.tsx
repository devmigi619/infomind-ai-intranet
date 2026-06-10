import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { getAssistantResponse } from '../api';
import { apiClient } from '../../../shared/api/client';
import { ActionCard } from './ActionCard';
import { InfoCard } from './InfoCard';
import { StatusCard } from './StatusCard';
import type { AssistantCard } from '../types';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const theme = useTheme();

  return (
    <View className="items-center py-10 px-4 gap-2">
      <View
        style={{ backgroundColor: theme.brand.primaryTint }}
        className="w-13 h-13 rounded-2xl items-center justify-center mb-2"
      >
        <MessageSquareText size={28} color={theme.brand.primary} style={{ opacity: 0.5 }} />
      </View>
      <Text
        style={{ color: theme.text.body, fontFamily: WEB_FONT }}
        className="text-[13px] font-medium text-center"
      >
        AI에게 물어보면 여기에 나타납니다
      </Text>
      <Text
        style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
        className="text-[12px] text-center leading-[19px]"
      >
        메시지를 보내면 관련 액션, 정보, 현황 카드를{'\n'}자동으로 정리해드립니다.
      </Text>
      <View className="flex-row flex-wrap justify-center gap-1.5 mt-2">
        {['휴가 신청해줘', '회의실 예약', '차량 예약'].map((ex) => (
          <View
            key={ex}
            style={{ backgroundColor: theme.brand.primaryTintSoft }}
            className="rounded-full px-2.5 py-1"
          >
            <Text
              style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}
              className="text-[11px]"
            >
              {ex}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Card renderer ────────────────────────────────────────────────────────────

function CardItem({ card }: { card: AssistantCard }) {
  if (card.type === 'action') return <ActionCard card={card} />;
  if (card.type === 'info') return <InfoCard card={card} />;
  if (card.type === 'status') return <StatusCard card={card} />;
  return null;
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface AssistantPanelProps {
  lastUserMessage: string | null;
  userName: string;
}

export function AssistantPanel({ lastUserMessage }: AssistantPanelProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const theme = useTheme();

  // 🌟 전역 스토어 상태 구독 (실시간 AI 결과)
  const { assistantContextCards, setAssistantContext, currentIntent, currentActionType } = useUiStore();

  // currentIntent가 설정되어 있고 카드 데이터가 없을 때, 백엔드 DB에서 동적 카드를 즉시 로드
  useEffect(() => {
    if (currentIntent && assistantContextCards.length === 0) {
      apiClient.get(`/api/chat/assistant/cards`, { params: { intent: currentIntent } })
        .then((res) => {
          if (res.data && res.data.data && res.data.data.cards) {
            setAssistantContext(res.data.data.cards);
          }
        })
        .catch((err) => {
          console.error('Failed to load assistant cards dynamically on mount:', err);
        });
    }
  }, [currentIntent, assistantContextCards.length, setAssistantContext]);

  const response = lastUserMessage ? getAssistantResponse(lastUserMessage) : null;
  
  // assistantContextCards가 있으면 우선 사용, 없으면 message 기반 로컬 폴백
  const cards = assistantContextCards.length > 0 ? assistantContextCards : (response?.cards || []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [lastUserMessage, fadeAnim]);

  // 카드가 아예 없거나 메시지가 없으면 EmptyState
  if (!lastUserMessage || cards.length === 0) {
    return <EmptyState />;
  }

  // 배너 라벨 맵
  const domainLabel: Record<string, string> = {
    mtgr: '회의실 예약',
    veh: '차량 예약',
    leave: '휴가 신청',
    aprv: '전자결재',
    schd: '일정 관리',
    brd: '게시판',
    rpt: '보고서',
  };
  const actionLabel: Record<string, string> = {
    search: '조회',
    excu: '신청',
    human: '질문 대기',
  };

  const domain = currentIntent ? (domainLabel[currentIntent] || '업무') : null;
  const action = currentActionType ? (actionLabel[currentActionType] || '진행') : null;

  return (
    <Animated.View style={{ opacity: fadeAnim }} className="gap-0">
      {/* 🌟 현재 처리 중인 의도를 상단 배너로 표시 */}
      {domain && action && (
        <View
          style={{ backgroundColor: theme.brand.primaryTintSoft }}
          className="p-2.5 rounded-lg mb-4"
        >
          <Text
            style={{ color: theme.brand.primary, fontFamily: WEB_FONT }}
            className="text-[12px] font-semibold"
          >
            🤖 AI가 {domain} {action}을(를) 처리하고 있습니다.
          </Text>
        </View>
      )}

      {/* Section label */}
      {cards.some((c) => c.type === 'action') && (
        <>
          <Text
            style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
            className="text-[11px] font-semibold tracking-wider uppercase mb-2"
          >
            관련 업무 바로가기
          </Text>
          <View className="gap-2">
            {cards
              .filter((c) => c.type === 'action')
              .map((card, i) => (
                <CardItem key={`action-${i}`} card={card} />
              ))}
          </View>
        </>
      )}

      {cards.some((c) => c.type === 'info') && (
        <>
          <Text
            style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
            className="text-[11px] font-semibold tracking-wider uppercase mb-2 mt-5"
          >
            관련 문서
          </Text>
          <View className="gap-2">
            {cards
              .filter((c) => c.type === 'info')
              .map((card, i) => (
                <CardItem key={`info-${i}`} card={card} />
              ))}
          </View>
        </>
      )}

      {cards.some((c) => c.type === 'status') && (
        <>
          <Text
            style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
            className="text-[11px] font-semibold tracking-wider uppercase mb-2 mt-5"
          >
            현황
          </Text>
          <View className="gap-2">
            {cards
              .filter((c) => c.type === 'status')
              .map((card, i) => (
                <CardItem key={`status-${i}`} card={card} />
              ))}
          </View>
        </>
      )}
    </Animated.View>
  );
}

