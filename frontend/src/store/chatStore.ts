import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message, FormField } from '../features/chat/types';
import type { AprvEntry } from '../features/leave-req/api';

// zustand v5 persist 미들웨어는 Expo Web(Hermes)에서 import.meta 미지원으로 사용 불가.
// uiStore.ts와 동일하게 subscribe() + AsyncStorage 직접 저장/로드 방식 사용.
const STORAGE_KEY = 'chat_session_v1';

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

interface ChatState {
  // ── 영속화 대상 ───────────────────────────────────────────────────────────
  messages: Message[];
  activeSessionId: string;
  pendingInterrupt: 'human' | 'excu' | 'form' | null;
  humanInterruptQuestion: string;
  turnId: string; // /chat SSE turn_id — /chat/resume 식별용 (기존 turnIdRef 대체)
  interruptAprvlList: AprvEntry[] | null;
  interruptRefList: AprvEntry[];
  /** excu/form interrupt preview 텍스트 */
  interruptPreviewText: string;
  /** form interrupt 동적 필드 목록 */
  interruptFormFields: FormField[] | null;
  /** form interrupt 제목 (예: 업무보고 작성) */
  interruptFormTitle: string;
  /** 빠른 액션 클릭 시 자동 전송할 메시지. MainScreen이 감지해 sendMessage 호출 후 null 처리 */
  pendingQuickMessage: string | null;
  /** 자비스패널(ai-context) 버튼이 요청한 resume 값. MainScreen이 감지해 sendResume 호출 후 null 처리 */
  pendingResumeValue: { value: string; display?: string } | null;

  // ── 액션 ──────────────────────────────────────────────────────────────────
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  setActiveSessionId: (id: string) => void;
  setPendingInterrupt: (v: 'human' | 'excu' | 'form' | null) => void;
  setHumanInterruptQuestion: (q: string) => void;
  setTurnId: (id: string) => void;
  setInterruptAprvlList: (list: AprvEntry[] | null) => void;
  setInterruptRefList: (list: AprvEntry[]) => void;
  setInterruptPreviewText: (text: string) => void;
  setInterruptFormFields: (fields: FormField[] | null) => void;
  setInterruptFormTitle: (title: string) => void;
  setPendingQuickMessage: (msg: string | null) => void;
  setPendingResumeValue: (v: { value: string; display?: string } | null) => void;
  /** 새 세션 시작 — state 초기화 + AsyncStorage 삭제 */
  resetSession: () => void;
  /** 마운트 시 AsyncStorage에서 이전 상태 복원 */
  hydrateFromStorage: () => Promise<void>;
}

const BLANK_SESSION = () => ({
  messages: [] as Message[],
  activeSessionId: generateSessionId(),
  pendingInterrupt: null as 'human' | 'excu' | 'form' | null,
  humanInterruptQuestion: '',
  turnId: '',
  interruptAprvlList: null as AprvEntry[] | null,
  interruptRefList: [] as AprvEntry[],
  interruptPreviewText: '',
  interruptFormFields: null as FormField[] | null,
  interruptFormTitle: '',
  pendingQuickMessage: null as string | null,
  pendingResumeValue: null as { value: string; display?: string } | null,
});

export const useChatStore = create<ChatState>((set) => ({
  ...BLANK_SESSION(),

  setMessages: (msgs) =>
    set((state) => ({
      messages: typeof msgs === 'function' ? msgs(state.messages) : msgs,
    })),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setPendingInterrupt: (v) => set({ pendingInterrupt: v }),
  setHumanInterruptQuestion: (q) => set({ humanInterruptQuestion: q }),
  setTurnId: (id) => set({ turnId: id }),
  setInterruptAprvlList: (list) => set({ interruptAprvlList: list }),
  setInterruptRefList: (list) => set({ interruptRefList: list }),
  setInterruptPreviewText: (text) => set({ interruptPreviewText: text }),
  setInterruptFormFields: (fields) => set({ interruptFormFields: fields }),
  setInterruptFormTitle: (title) => set({ interruptFormTitle: title }),
  setPendingQuickMessage: (msg) => set({ pendingQuickMessage: msg }),
  setPendingResumeValue: (v) => set({ pendingResumeValue: v }),

  resetSession: () => {
    set(BLANK_SESSION());
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  hydrateFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      set({
        messages:               saved.messages               ?? [],
        activeSessionId:        saved.activeSessionId        ?? generateSessionId(),
        pendingInterrupt:       saved.pendingInterrupt       ?? null,
        humanInterruptQuestion: saved.humanInterruptQuestion ?? '',
        turnId:                 saved.turnId                 ?? '',
        interruptAprvlList:     saved.interruptAprvlList     ?? null,
        interruptRefList:       saved.interruptRefList       ?? [],
        interruptPreviewText:   saved.interruptPreviewText   ?? '',
        interruptFormFields:    saved.interruptFormFields    ?? null,
        interruptFormTitle:     saved.interruptFormTitle     ?? '',
      });
    } catch {
      // 복원 실패 시 조용히 초기 상태 유지
    }
  },
}));

// ── 자동 저장 (subscribe) ────────────────────────────────────────────────────
// messages / activeSessionId / pendingInterrupt 변경 감지 → AsyncStorage 갱신.
// 나머지 필드(humanInterruptQuestion 등)는 interrupt 상태 변경 시 함께 저장.
let _prev = useChatStore.getState();

useChatStore.subscribe((state) => {
  const changed =
    state.messages !== _prev.messages ||
    state.activeSessionId !== _prev.activeSessionId ||
    state.pendingInterrupt !== _prev.pendingInterrupt ||
    state.humanInterruptQuestion !== _prev.humanInterruptQuestion ||
    state.turnId !== _prev.turnId ||
    state.interruptAprvlList !== _prev.interruptAprvlList ||
    state.interruptRefList !== _prev.interruptRefList ||
    state.interruptPreviewText !== _prev.interruptPreviewText ||
    state.interruptFormFields !== _prev.interruptFormFields ||
    state.interruptFormTitle !== _prev.interruptFormTitle;

  if (!changed) return;
  _prev = state;

  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      messages:               state.messages,
      activeSessionId:        state.activeSessionId,
      pendingInterrupt:       state.pendingInterrupt,
      humanInterruptQuestion: state.humanInterruptQuestion,
      turnId:                 state.turnId,
      interruptAprvlList:     state.interruptAprvlList,
      interruptRefList:       state.interruptRefList,
      interruptPreviewText:   state.interruptPreviewText,
      interruptFormFields:    state.interruptFormFields,
      interruptFormTitle:     state.interruptFormTitle,
    }),
  ).catch(() => {});
});
