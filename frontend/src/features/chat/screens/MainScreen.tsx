import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { Text } from '../../../shared/components/ui/text';
import { Sparkles, Menu } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../../../shared/components/ChatMessage';
import { ChatInput } from '../../../shared/components/ChatInput';
import { FloatingResetButton } from '../../../shared/components/FloatingResetButton';
import { useUiStore } from '../../../store/uiStore';
import { useChatStore } from '../../../store/chatStore';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { ChatHistorySidebar } from '../components/ChatHistorySidebar';
import { InterruptReplyPanel } from '../components/InterruptReplyPanel';
import { InterruptPanel } from '../components/InterruptPanel';
import { MobileInterruptSheet } from '../components/MobileInterruptSheet';
import { useChatSessionMessages } from '../api';
import { useCurrentUser } from '../../auth/api';
import { getAssistantResponseByIntent } from '../../ai-assistant/api';
import { useAiContextStore } from '../../ai-context/store';
import { apiClient } from '../../../shared/api/client';
import type { Message } from '../types';

interface MainScreenProps {
  user: { name: string } | null;
  onNavigate: (tabId: string) => void;
  onAiResponseComplete?: () => void;
}

const THINKING_ID = 'thinking';
const STREAMING_ID = 'streaming';
const DRAWER_WIDTH = 260;

export function MainScreen({ user, onNavigate, onAiResponseComplete }: MainScreenProps) {
  const { isMobile } = useResponsive();

  // ─── 영속화 상태 (Zustand + AsyncStorage) ────────────────────────────────
  // 내비게이션으로 언마운트/리마운트 시에도 대화 이력 및 interrupt 상태 유지
  const {
    messages,
    setMessages,
    activeSessionId,
    setActiveSessionId,
    pendingInterrupt,
    setPendingInterrupt,
    humanInterruptQuestion,
    setHumanInterruptQuestion,
    turnId,
    setTurnId,
    interruptAprvlList,
    setInterruptAprvlList,
    interruptRefList,
    setInterruptRefList,
    interruptPreviewText,
    setInterruptPreviewText,
    interruptFormFields,
    setInterruptFormFields,
    interruptFormTitle,
    setInterruptFormTitle,
    pendingQuickMessage,
    setPendingQuickMessage,
    pendingResumeValue,
    setPendingResumeValue,
    resetSession,
    hydrateFromStorage,
  } = useChatStore();

  // ─── 비영속 UI 상태 ───────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiContextEnabled, setAiContextEnabled] = useState(true);

  // 현재 사용자 ID (AprvLineEditorPanel에서 본인 제외용)
  const { data: currentUser } = useCurrentUser();

  // 이력에서 세션 선택 시 메시지 로딩용
  const [selectedSessId, setSelectedSessId] = useState<string | null>(null);
  const { data: historyData } = useChatSessionMessages(selectedSessId);

  const scrollRef = useRef<ScrollView>(null);

  const setLastUserMessage = useUiStore((s) => s.setLastUserMessage);
  const markAiUnread = useUiStore((s) => s.markAiUnread);
  const chatResetCounter = useUiStore((s) => s.chatResetCounter);
  const currentIntent = useUiStore((s) => s.currentIntent);
  const theme = useTheme();

  // ─── 마운트 시 이전 상태 복원 ────────────────────────────────────────────
  useEffect(() => {
    hydrateFromStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 드로어 애니메이션 (모바일) ───────────────────────────────────────────
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
      duration: 240,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, drawerAnim]);

  // ─── 이력 세션 메시지 로딩 ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSessId || !historyData || historyData.length === 0) return;
    setMessages(
      historyData.map((m) => ({
        id: `h-${m.chatSn}`,
        role: m.chatSe === 'U' ? 'user' : 'assistant',
        content: m.chatDesc,
      })),
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, [selectedSessId, historyData, setMessages]);

  // ─── 리셋 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatResetCounter === 0) return;
    resetSession();
    setSelectedSessId(null);
    useAiContextStore.getState().clear();
  }, [chatResetCounter, resetSession]);

  // ─── 핸들러: 새 세션 ─────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    resetSession();
    setSelectedSessId(null);
    setInterruptPreviewText('');
    setInterruptFormFields(null);
    setInterruptFormTitle('');
    setDrawerOpen(false);
    useAiContextStore.getState().clear();
  }, [resetSession, setInterruptPreviewText, setInterruptFormFields, setInterruptFormTitle]);

  // ─── 핸들러: 세션 선택 ───────────────────────────────────────────────────
  const handleSelectSession = useCallback((sessId: string) => {
    // 선택한 이력 세션으로 전환 — interrupt/turnId 초기화 후 DB 메시지 로드
    setMessages([]);
    setPendingInterrupt(null);
    setHumanInterruptQuestion('');
    setInterruptAprvlList(null);
    setInterruptRefList([]);
    setInterruptPreviewText('');
    setInterruptFormFields(null);
    setInterruptFormTitle('');
    setTurnId('');
    setActiveSessionId(sessId);
    setSelectedSessId(sessId);
    setDrawerOpen(false);
    useAiContextStore.getState().clear();
  }, [
    setMessages, setPendingInterrupt, setHumanInterruptQuestion,
    setInterruptAprvlList, setInterruptRefList,
    setInterruptPreviewText, setInterruptFormFields, setInterruptFormTitle,
    setTurnId, setActiveSessionId,
  ]);

  // ─── SSE 스트림 ──────────────────────────────────────────────────────────
  const _runSseStream = useCallback(
    async (url: string, body: object, token: string | null) => {
      const AI_URL = process.env.EXPO_PUBLIC_AI_URL ?? 'http://192.168.0.178:8000';

      setMessages((prev) => [
        ...prev,
        { id: THINKING_ID, role: 'assistant', content: '', isThinking: true },
      ]);
      setIsStreaming(true);

      try {
        const response = await fetch(`${AI_URL}${url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) throw new Error('SSE connection failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let actions: { label: string; target: string }[] = [];
        let firstTokenReceived = false;
        let detectedInterrupt: 'human' | 'excu' | 'form' | null = null;
        let interruptQuestion: string | null = null; // interrupt payload의 question/preview 텍스트
        let streamAiContextEnabled = aiContextEnabled;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'turn_id') {
                // 백엔드가 매 턴마다 생성한 MemorySaver thread_id — /chat/resume 식별용
                setTurnId(data.turn_id);
              } else if (data.type === 'ai_context') {
                // 자비스패널(사물 채널) 스냅샷 — 매 이벤트가 전체 화면
                if (streamAiContextEnabled) {
                  useAiContextStore.getState().setSnapshot(data);
                }
              } else if (data.type === 'meta') {
                actions = data.actions ?? [];
                streamAiContextEnabled = data.ai_context_enabled !== false;
                setAiContextEnabled(streamAiContextEnabled);
                if (!streamAiContextEnabled) {
                  useAiContextStore.getState().clear();
                }
                // 도메인 전환 소멸 — leave 외 도메인 확정 시 자비스패널 정리
                if (data.intent && data.intent !== 'leave') {
                  useAiContextStore.getState().clear();
                }
                if (data.intent) {
                  // 백엔드 API에서 동적 카드 정보 조회 (Spring Boot)
                  apiClient.get(`/api/chat/assistant/cards`, { params: { intent: data.intent } })
                    .then((res) => {
                      if (res.data && res.data.data && res.data.data.cards) {
                        useUiStore.getState().setAssistantContext(res.data.data.cards);
                      }
                    })
                    .catch((err) => {
                      console.error('Error fetching assistant cards:', err);
                      // 실패 시 기존 로컬 더미 데이터로 폴백
                      const res = getAssistantResponseByIntent(data.intent);
                      if (res) {
                        useUiStore.getState().setAssistantContext(res.cards);
                      }
                    });

                  useUiStore.getState().setAiContext(data.intent, data.action_type || null);
                  
                  // 🌟 자동으로 AI 탭 포커싱 및 우측 패널 열기
                  useUiStore.getState().setRpTab('ai');
                  if (!useUiStore.getState().isRightPanelOpen) {
                    useUiStore.setState({ isRightPanelOpen: true });
                  }
                }
              } else if (data.type === 'progress') {
                // detail_status(상세)를 우선 사용, 없으면 status(coarse)로 폴백.
                // thinking 버블에 단계를 누적 — 직전 단계와 동일하면 무시(중복 제거).
                const label: string | undefined = data.detail_status ?? data.status;
                if (label) {
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== THINKING_ID) return m;
                      const steps = m.progressSteps ?? [];
                      if (steps[steps.length - 1] === label) return m;
                      return { ...m, content: label, progressSteps: [...steps, label] };
                    }),
                  );
                }
              } else if (data.type === 'token') {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === THINKING_ID
                        ? { id: STREAMING_ID, role: 'assistant', content: data.content, isStreaming: true }
                        : m,
                    ),
                  );
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === STREAMING_ID
                        ? { ...m, content: m.content + data.content }
                        : m,
                    ),
                  );
                }
              } else if (data.type === 'interrupt') {
                detectedInterrupt = data.interrupt_type as 'human' | 'excu' | 'form';
                // node_excu_preflight처럼 토큰 스트리밍 없이 interrupt가 발생한 경우
                // question/preview 텍스트를 payload에서 직접 추출한다.
                interruptQuestion = data.question ?? data.preview ?? null;

                if (data.interrupt_type === 'human' && interruptQuestion) {
                  // human: 채팅 하단 InterruptReplyPanel용
                  setHumanInterruptQuestion(interruptQuestion);
                } else if (data.interrupt_type === 'excu') {
                  // excu: 패널에 preview 텍스트 + 결재선 표시
                  setInterruptPreviewText(data.preview ?? '');
                  if (data.aprvl_list !== undefined) {
                    setInterruptAprvlList(data.aprvl_list);
                    setInterruptRefList(data.ref_list ?? []);
                  } else {
                    setInterruptAprvlList(null);
                    setInterruptRefList([]);
                  }
                } else if (data.interrupt_type === 'form') {
                  // form: 패널에 동적 폼 필드 표시
                  setInterruptPreviewText(data.preview ?? '');
                  setInterruptFormFields(data.form_fields ?? null);
                  setInterruptFormTitle(data.form_title ?? '양식 작성');
                  setInterruptAprvlList(null);
                  setInterruptRefList([]);
                }
              } else if (data.type === 'done') {
                const ts = `a-${Date.now()}`;
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id === STREAMING_ID) {
                      // 토큰이 스트리밍된 정상 경로
                      return {
                        ...m,
                        id: ts,
                        actions,
                        isStreaming: false,
                        interruptType: detectedInterrupt ?? undefined,
                      };
                    }
                    if (m.id === THINKING_ID) {
                      // 토큰 없이 interrupt된 경우 (node_excu_preflight 등)
                      // question 텍스트를 content로 세팅하고 thinking 상태 해제
                      return {
                        ...m,
                        id: ts,
                        content: interruptQuestion ?? m.content,
                        isThinking: false,
                        isStreaming: false,
                        actions,
                        interruptType: detectedInterrupt ?? undefined,
                      };
                    }
                    return m;
                  }),
                );
                if (detectedInterrupt) setPendingInterrupt(detectedInterrupt);
              }
            } catch {
              // incomplete chunk — skip
            }
          }
        }

        // done 이벤트 없이 스트림 종료 시 정리
        // THINKING_ID 도 함께 처리 — interrupt 없이 스트림이 끊긴 경우 thinking 상태 해제
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === STREAMING_ID) {
              return { ...m, id: `a-${Date.now()}`, isStreaming: false };
            }
            if (m.id === THINKING_ID) {
              return { ...m, id: `a-${Date.now()}`, isThinking: false, isStreaming: false };
            }
            return m;
          }),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === THINKING_ID || m.id === STREAMING_ID
              ? {
                  id: `a-${Date.now()}`,
                  role: 'assistant',
                  content: 'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
                  isStreaming: false,
                  isThinking: false,
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        markAiUnread();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        onAiResponseComplete?.();
      }
    },
    [
      setMessages, setTurnId, setHumanInterruptQuestion,
      setInterruptAprvlList, setInterruptRefList, setPendingInterrupt,
      setInterruptPreviewText, setInterruptFormFields, setInterruptFormTitle,
      markAiUnread, onAiResponseComplete, aiContextEnabled,
    ],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      setLastUserMessage(text.trim());

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: text.trim() },
      ]);
      setInputText('');

      const token = await AsyncStorage.getItem('token');
      await _runSseStream(
        '/ai/chat',
        { message: text.trim(), history, session_id: activeSessionId },
        token,
      );
    },
    [isStreaming, messages, activeSessionId, setLastUserMessage, setMessages, _runSseStream],
  );

  const sendResume = useCallback(
    async (resumeValue: string, displayText?: string) => {
      if (isStreaming) return;

      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, interruptType: undefined }
            : m,
        ),
      );

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: displayText ?? resumeValue },
      ]);
      setInputText('');
      setPendingInterrupt(null);
      setHumanInterruptQuestion('');
      setInterruptAprvlList(null);
      setInterruptRefList([]);
      setInterruptPreviewText('');
      setInterruptFormFields(null);
      setInterruptFormTitle('');

      const token = await AsyncStorage.getItem('token');
      await _runSseStream(
        '/ai/chat/resume',
        { turn_id: turnId, resume_value: resumeValue },
        token,
      );
    },
    [
      isStreaming, turnId,
      setMessages, setPendingInterrupt, setHumanInterruptQuestion,
      setInterruptAprvlList, setInterruptRefList,
      setInterruptPreviewText, setInterruptFormFields, setInterruptFormTitle,
      _runSseStream,
    ],
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  // ─── 빠른 액션 자동 전송 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingQuickMessage || isStreaming) return;
    const msg = pendingQuickMessage;
    setPendingQuickMessage(null);
    sendMessage(msg);
  // sendMessage는 useCallback 의존성이 변경되어도 동일 로직 — msg 기반 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuickMessage]);

  // ─── 자비스패널(ai-context) 버튼 → resume 합류 ──────────────────────────
  // 패널의 제출/취소는 구조화된 사용자 발화 — 채팅과 같은 대화 상태로 합류한다
  useEffect(() => {
    if (!pendingResumeValue || isStreaming) return;
    const { value, display } = pendingResumeValue;
    setPendingResumeValue(null);
    sendResume(value, display);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResumeValue]);

  const isEmpty = messages.length === 0;

  // ─── 사이드바 (공통) ─────────────────────────────────────────────────────
  const sidebar = (
    <ChatHistorySidebar
      activeSessId={activeSessionId}
      onSelectSession={handleSelectSession}
      onNewSession={handleNewSession}
    />
  );

  // ─── 채팅 영역 ────────────────────────────────────────────────────────────
  const chatArea = (
    <View
      style={{ backgroundColor: theme.bg.surface }}
      className={`flex-1 ${isEmpty ? 'justify-end' : ''}`}
    >
      {isEmpty ? (
        <View className="absolute inset-0 items-center justify-center px-6 gap-2">
          <View style={{ backgroundColor: theme.brand.primaryTint }} className="w-16 h-16 rounded-[20px] items-center justify-center mb-2">
            <Sparkles size={32} color={theme.brand.primary} />
          </View>
          <Text style={{ color: theme.text.primary }} className="text-[22px] font-medium">
            안녕하세요, {user?.name ?? ''}님
          </Text>
          <Text style={{ color: theme.text.muted }} className="text-[14px] mb-4">
            무엇을 도와드릴까요?
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 32, paddingVertical: 24, gap: 16 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              actions={msg.actions}
              onActionPress={(target) => onNavigate(target)}
              isStreaming={msg.isStreaming}
              isThinking={msg.isThinking}
              progressSteps={msg.progressSteps}
              interruptType={msg.interruptType}
            />
          ))}
        </ScrollView>
      )}

      <FloatingResetButton />

      {pendingInterrupt === 'human' ? (
        <InterruptReplyPanel
          question={humanInterruptQuestion}
          theme={theme}
          onSend={(answer) => sendResume(answer)}
          onCancel={() => sendResume('취소')}
        />
      ) : (
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          disabled={isStreaming || pendingInterrupt === 'excu' || pendingInterrupt === 'form'}
          theme={theme}
        />
      )}
    </View>
  );

  // ─── Interrupt Panel/Sheet 공통 props ───────────────────────────────────
  const panelProps = {
    isOpen: pendingInterrupt !== null && pendingInterrupt !== 'human',
    interruptType: pendingInterrupt as 'excu' | 'form' | null,
    previewText: interruptPreviewText,
    formTitle: interruptFormTitle,
    formFields: interruptFormFields,
    aprvlList: interruptAprvlList,
    refList: interruptRefList,
    currentUserId: currentUser?.userId,
    onApprove: (val: string, display?: string) => sendResume(val, display),
    onCancel: () => sendResume('취소'),
  };
  const hideInterruptPanelForAiContext = aiContextEnabled && currentIntent === 'leave';

  // ─── PC 레이아웃 ─────────────────────────────────────────────────────────
  // 자비스패널이 켜진 경우에만 leave excu/form 확인을 RP AI 탭이 담당한다.
  // 꺼져 있으면 main처럼 일반 InterruptPanel을 표시한다.
  if (!isMobile) {
    return (
      <View className="flex-1 flex-row">
        {sidebar}
        {chatArea}
        <InterruptPanel
          {...panelProps}
          isOpen={panelProps.isOpen && !hideInterruptPanelForAiContext}
        />
      </View>
    );
  }

  // ─── 모바일 레이아웃 ─────────────────────────────────────────────────────
  return (
    <View className="flex-1 relative">
      {/* 햄버거 버튼 */}
      <TouchableOpacity
        style={{ backgroundColor: theme.bg.surface }}
        className="absolute top-2.5 left-2.5 z-10 w-[34px] h-[34px] rounded-lg items-center justify-center shadow-md"
        onPress={() => setDrawerOpen(true)}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Menu size={18} color={theme.text.muted} />
      </TouchableOpacity>

      {chatArea}

      {/* 드로어 오버레이 */}
      {drawerOpen && (
        <Pressable
          className="absolute inset-0 z-20"
          onPress={() => setDrawerOpen(false)}
        >
          <View className="absolute inset-0 bg-black/35" />
        </Pressable>
      )}

      {/* 드로어 패널 */}
      <Animated.View
        style={{
          width: DRAWER_WIDTH,
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
          backgroundColor: theme.bg.surfaceAlt,
          transform: [{ translateX: drawerAnim }],
        }}
        className="absolute top-0 left-0 bottom-0 z-30"
        pointerEvents={drawerOpen ? 'auto' : 'none'}
      >
        {sidebar}
      </Animated.View>

      {/* 바텀 시트 (excu / form interrupt) */}
      <MobileInterruptSheet {...panelProps} />
    </View>
  );
}


