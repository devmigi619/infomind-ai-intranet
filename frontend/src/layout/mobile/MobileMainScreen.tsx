import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import { ChatMessage } from '../../shared/components/ChatMessage';
import { ChatInput } from '../../shared/components/ChatInput';
import { MobileAssistantFloat } from './MobileAssistantFloat';
import { FloatingResetButton } from '../../shared/components/FloatingResetButton';
import { getAssistantResponse } from '../../features/ai-assistant/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MobileMainScreenProps {
  userName: string;
}

function buildBriefing(userName: string): Message {
  return {
    id: 'briefing-' + Date.now(),
    role: 'assistant',
    content: `좋은 아침입니다, ${userName} 님 ☀️\n\n오늘 챙기실 일을 정리해드렸어요:\n\n• 받은 결재 5건 (휴가신청 김철수 D-2 임박)\n• 오늘 일정 3건 (10:00 스프린트 플래닝)\n• 주간보고 마감 D-1 (작성 미시작)\n• 새 공지 2건 (사옥 이전 안내)\n\n도움 필요하시면 말씀해주세요.`,
  };
}

// 키워드 매칭 기반 자연어 응답
const CONTEXT_RESPONSES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ['휴가', '연차', '반차', '월차'],
    reply: '언제 쓰실 건가요? 시작일과 종료일을 알려주시면 휴가 신청을 도와드릴게요.',
  },
  {
    keywords: ['차량', '차를', '법인차', '렌터카'],
    reply: '언제 어디로 이동하시나요? 차량 예약 정보를 알려주시면 확인해드릴게요.',
  },
  {
    keywords: ['회의실', '미팅룸', '회의 예약'],
    reply: '몇 명이 사용하실 예정이고, 언제 필요하신가요? 회의실 현황을 확인해드릴게요.',
  },
  {
    keywords: ['결재', '품의', '승인', '전자결재'],
    reply: '어떤 결재가 필요하신가요? 결재 유형을 알려주시면 양식을 안내해드릴게요.',
  },
  {
    keywords: ['주간보고', '주간 보고', '보고서'],
    reply: '이번 주 주요 업무를 알려주시면 주간보고 초안을 작성해드릴게요. 어떤 일을 하셨나요?',
  },
  {
    keywords: ['증명서', '재직', '경력증명', '급여증명'],
    reply: '어떤 증명서가 필요하신가요? 발급 절차를 안내해드릴게요.',
  },
  {
    keywords: ['교육', '연수', '외부 교육', '사내 교육'],
    reply: '어떤 교육을 수강하실 예정인가요? 교육 지원 절차를 안내해드릴게요.',
  },
  {
    keywords: ['비품', '구매', '노트북', '소모품'],
    reply: '어떤 비품이 필요하신가요? 구매 절차와 품의 작성을 도와드릴게요.',
  },
  {
    keywords: ['출장', '출장비', '교통비 정산'],
    reply: '출장 일정과 목적지를 알려주시면 출장 신청서 작성을 도와드릴게요.',
  },
];

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  const matched = CONTEXT_RESPONSES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw)),
  );
  if (matched) return matched.reply;
  return `"${message}"에 대해 확인 중입니다. 잠시만 기다려주세요.`;
}

// ─── Height constants (must match MobileAssistantFloat) ──────────────────────
const COLLAPSED_HEIGHT = 40;
const MEDIUM_QUICK_HEIGHT = 180;
const MEDIUM_CONTEXT_HEIGHT = 138;
// Outer margin: marginTop 12 + marginHorizontal 12 (vertical only matters for padding)
const ASSISTANT_MARGIN_TOP = 12;
const ASSISTANT_MARGIN_BOTTOM = 12; // gap between assistant bottom and messages

export function MobileMainScreen({ userName }: MobileMainScreenProps) {
  const theme = useTheme();
  const chatResetCounter = useUiStore((s) => s.chatResetCounter);
  const assistantStage = useUiStore((s) => s.assistantStage);
  const assistantMode = useUiStore((s) => s.assistantMode);
  const assistantContextCards = useUiStore((s) => s.assistantContextCards);
  const setAssistantMode = useUiStore((s) => s.setAssistantMode);
  const setAssistantContext = useUiStore((s) => s.setAssistantContext);

  const [messages, setMessages] = useState<Message[]>(() => [buildBriefing(userName)]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<import('react-native').ScrollView>(null);

  // ─── Shared Animated.Value for assistant height ───────────────────────────
  const hasContextActions =
    assistantMode === 'context' && assistantContextCards.some((c) => c.type === 'action');
  const mediumHeight = hasContextActions ? MEDIUM_CONTEXT_HEIGHT : MEDIUM_QUICK_HEIGHT;
  const targetHeight = assistantStage === 'collapsed' ? COLLAPSED_HEIGHT : mediumHeight;

  const heightAnim = useRef(new Animated.Value(targetHeight)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: 240,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [targetHeight, heightAnim]);

  // spacerHeightAnim = heightAnim + margins — same Animated.Value base → same frame
  const spacerHeightAnim = useRef(
    Animated.add(heightAnim, new Animated.Value(ASSISTANT_MARGIN_TOP + ASSISTANT_MARGIN_BOTTOM)),
  ).current;

  // Reset chat when counter changes
  useEffect(() => {
    setMessages([buildBriefing(userName)]);
    setInputText('');
  }, [chatResetCounter, userName]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Message = {
        id: 'user-' + Date.now(),
        role: 'user',
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      // 컨텍스트 분류 — 키워드 매칭 즉시 수행
      const assistantResponse = getAssistantResponse(trimmed);
      if (assistantResponse) {
        setAssistantContext(assistantResponse.cards);
        setAssistantMode('context');
      } else {
        setAssistantContext([]);
        setAssistantMode('quickAction');
      }

      // Mock AI response after short delay
      setTimeout(() => {
        const aiMsg: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: getMockResponse(trimmed),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 600);
    },
    [setAssistantMode, setAssistantContext],
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.app }]}>
      {/* Chat messages — Spacer tracks assistantHeight via Animated.add (works on RN Web) */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      >
        {/* Spacer — exact same height as the floating assistant card */}
        <Animated.View style={{ height: spacerHeightAnim }} pointerEvents="none" />
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
      </ScrollView>

      {/* Chat input — always below messages, never behind assistant */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        theme={theme}
      />

      {/* AI Assistant — absolute, overlays message area top */}
      <Animated.View
        style={[
          styles.assistantWrapper,
          { height: heightAnim },
        ]}
        pointerEvents="box-none"
      >
        <MobileAssistantFloat heightAnim={heightAnim} />
      </Animated.View>

      {/* Floating reset button */}
      <FloatingResetButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  assistantWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    // height is driven by heightAnim
    overflow: 'hidden',
    borderRadius: 12,
  },
});
