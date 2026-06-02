import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
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
import { ChatAprvModal } from '../components/ChatAprvModal';
import { InterruptReplyPanel } from '../components/InterruptReplyPanel';
import { useChatSessionMessages } from '../api';
import { useCurrentUser } from '../../auth/api';
import type { AprvEntry } from '../../leave-req/api';
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
    resetSession,
    hydrateFromStorage,
  } = useChatStore();

  // ─── 비영속 UI 상태 ───────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAprvModal, setShowAprvModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 현재 사용자 ID (AprvLineEditorPanel에서 본인 제외용)
  const { data: currentUser } = useCurrentUser();

  // 이력에서 세션 선택 시 메시지 로딩용
  const [selectedSessId, setSelectedSessId] = useState<string | null>(null);
  const { data: historyData } = useChatSessionMessages(selectedSessId);

  const scrollRef = useRef<ScrollView>(null);

  const setLastUserMessage = useUiStore((s) => s.setLastUserMessage);
  const markAiUnread = useUiStore((s) => s.markAiUnread);
  const chatResetCounter = useUiStore((s) => s.chatResetCounter);
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
    setShowAprvModal(false);
  }, [chatResetCounter, resetSession]);

  // ─── 핸들러: 새 세션 ─────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    resetSession();
    setSelectedSessId(null);
    setShowAprvModal(false);
    setDrawerOpen(false);
  }, [resetSession]);

  // ─── 핸들러: 세션 선택 ───────────────────────────────────────────────────
  const handleSelectSession = useCallback((sessId: string) => {
    // 선택한 이력 세션으로 전환 — interrupt/turnId 초기화 후 DB 메시지 로드
    setMessages([]);
    setPendingInterrupt(null);
    setHumanInterruptQuestion('');
    setInterruptAprvlList(null);
    setInterruptRefList([]);
    setTurnId('');
    setActiveSessionId(sessId);
    setSelectedSessId(sessId);
    setDrawerOpen(false);
  }, [
    setMessages, setPendingInterrupt, setHumanInterruptQuestion,
    setInterruptAprvlList, setInterruptRefList, setTurnId, setActiveSessionId,
  ]);

  // ─── SSE 스트림 ──────────────────────────────────────────────────────────
  const _runSseStream = useCallback(
    async (url: string, body: object, token: string | null) => {
      const AI_URL = process.env.EXPO_PUBLIC_AI_URL ?? 'http://localhost:8000';

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
        let detectedInterrupt: 'human' | 'excu' | null = null;
        let interruptQuestion: string | null = null; // interrupt payload의 question/preview 텍스트

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
              } else if (data.type === 'meta') {
                actions = data.actions ?? [];
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
                detectedInterrupt = data.interrupt_type as 'human' | 'excu';
                // node_excu_preflight처럼 토큰 스트리밍 없이 interrupt가 발생한 경우
                // question/preview 텍스트를 payload에서 직접 추출한다.
                interruptQuestion = data.question ?? data.preview ?? null;
                // human interrupt라면 패널에 표시할 질문 텍스트를 state에 저장
                if (data.interrupt_type === 'human' && interruptQuestion) {
                  setHumanInterruptQuestion(interruptQuestion);
                }
                // 결재선 데이터가 있으면 저장 (excu + 결재선 필요 intent일 때만 포함)
                if (data.interrupt_type === 'excu' && data.aprvl_list !== undefined) {
                  setInterruptAprvlList(data.aprvl_list as AprvEntry[]);
                  setInterruptRefList((data.ref_list ?? []) as AprvEntry[]);
                } else {
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
      markAiUnread, onAiResponseComplete,
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
      setShowAprvModal(false);

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
      _runSseStream,
    ],
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

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
      style={[
        styles.chatArea,
        isEmpty && styles.chatAreaEmpty,
        { backgroundColor: theme.bg.surface },
      ]}
    >
      {isEmpty ? (
        <View style={styles.welcome}>
          <View style={[styles.iconWrap, { backgroundColor: theme.brand.primaryTint }]}>
            <Sparkles size={32} color={theme.brand.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text.primary }]}>
            안녕하세요, {user?.name ?? ''}님
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.text.muted }]}>
            무엇을 도와드릴까요?
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
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
              onInterruptApprove={() => {
                if (interruptAprvlList !== null) {
                  // 결재선 편집 모달 열기
                  setShowAprvModal(true);
                } else {
                  // 결재선 없는 일반 excu / human — 바로 resume
                  sendResume('승인');
                }
              }}
              onInterruptCancel={() => sendResume('취소')}
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
          disabled={isStreaming || pendingInterrupt === 'excu'}
          theme={theme}
        />
      )}
    </View>
  );

  // ─── 결재선 편집 모달 (공통) ─────────────────────────────────────────────
  const aprvModal = (
    <ChatAprvModal
      visible={showAprvModal}
      initialAprvList={interruptAprvlList ?? []}
      initialRefList={interruptRefList}
      currentUserId={currentUser?.userId}
      onApprove={(editedAprvList, editedRefList) => {
        // 편집된 결재선을 JSON으로 직렬화해 resume_value로 전송
        // displayText('승인')를 별도 전달해 채팅 버블에는 JSON 대신 '승인'만 표시
        const resumeValue = JSON.stringify({
          decision:   '승인',
          aprvl_list: editedAprvList.map((a) => ({ aprvUserId: a.aprvUserId })),
          ref_list:   editedRefList.map((r) => r.aprvUserId),
        });
        sendResume(resumeValue, '승인');
      }}
      onCancel={() => {
        setShowAprvModal(false);
      }}
    />
  );

  // ─── PC 레이아웃 ─────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <View style={styles.pcContainer}>
        {sidebar}
        {chatArea}
        {aprvModal}
      </View>
    );
  }

  // ─── 모바일 레이아웃 ─────────────────────────────────────────────────────
  return (
    <View style={styles.mobileContainer}>
      {aprvModal}
      {/* 햄버거 버튼 */}
      <TouchableOpacity
        style={[styles.hamburger, { backgroundColor: theme.bg.surface }]}
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
          style={[styles.overlay]}
          onPress={() => setDrawerOpen(false)}
        >
          <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </Pressable>
      )}

      {/* 드로어 패널 */}
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: theme.bg.surfaceAlt },
          { transform: [{ translateX: drawerAnim }] },
        ]}
        pointerEvents={drawerOpen ? 'auto' : 'none'}
      >
        {sidebar}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── PC ────────────────────────────────────────────────────────────────
  pcContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  // ─── Mobile ────────────────────────────────────────────────────────────
  mobileContainer: {
    flex: 1,
    position: 'relative',
  },
  hamburger: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  // ─── 채팅 영역 ─────────────────────────────────────────────────────────
  chatArea: {
    flex: 1,
  },
  chatAreaEmpty: {
    justifyContent: 'flex-end',
  },
  welcome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '500',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 16,
  },
});
