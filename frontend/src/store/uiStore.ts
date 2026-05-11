import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PanelId, RpTab } from '../types';
import type { AssistantCard } from '../features/ai-assistant/types';
import { ALL_MENUS } from '../shared/constants/menus';

// zustand v5의 persist 미들웨어가 import.meta를 사용하는데
// Expo Web의 Hermes 엔진이 import.meta를 지원하지 않아 별도 구현.
const storageKey = (userId: string) => `infomind-ui:${userId}`;

export type SettingsCategory = 'account' | 'notification' | 'customize' | 'display';
export type ThemePreference = 'light' | 'dark' | 'system';
export type AssistantStage = 'collapsed' | 'medium' | 'full';
export type AssistantMode = 'quickAction' | 'context';

/** 게시판 LP → 풀뷰 컨텍스트 전달용 */
export interface BoardLpHandoff {
  brdId: string;
  pstSn?: number;
}

interface UiState {
  // State
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isRightPanelOpen: boolean;
  rpTab: RpTab;
  isAdminMode: boolean;
  hasUnreadAi: boolean;
  pinnedMenusUser: PanelId[];
  pinnedMenusAdmin: PanelId[];
  settingsCategory: SettingsCategory;
  lastUserMessage: string | null;
  themePreference: ThemePreference;
  assistantStage: AssistantStage;
  assistantMode: AssistantMode;
  chatResetCounter: number;
  assistantContextCards: AssistantCard[];
  assistantContextSeen: boolean;
  isCustomizationOpen: boolean;
  previousFullScreen: PanelId | null;
  boardLpHandoff: BoardLpHandoff | null;

  // Actions
  handleNavClick: (panel: PanelId | 'home') => void;
  openFullScreen: () => void;
  openSettingsScreen: () => void;
  goHome: () => void;
  closeLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleAdminMode: () => void;
  setRpTab: (tab: RpTab) => void;
  markAiUnread: () => void;
  markAiRead: () => void;
  togglePinnedMenu: (panel: PanelId, maxCount: number) => void;
  reorderPinnedMenus: (from: number, to: number) => void;
  setSettingsCategory: (category: SettingsCategory) => void;
  setLastUserMessage: (message: string | null) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setAssistantStage: (stage: AssistantStage) => void;
  setAssistantMode: (mode: AssistantMode) => void;
  setAssistantContext: (cards: AssistantCard[]) => void;
  resetChat: () => void;
  setActiveFullScreen: (panelId: PanelId | null) => void;
  setCustomizationOpen: (open: boolean) => void;
  setBoardLpHandoff: (handoff: BoardLpHandoff | null) => void;
  hydrateFromStorage: (userId: string) => Promise<void>;
  resetUiToDefaults: () => void;
}

// 디폴트 값들 — resetUiToDefaults에서 재사용
const DEFAULT_PINNED_USER: PanelId[] = ['board', 'approval', 'report'];
const DEFAULT_PINNED_ADMIN: PanelId[] = ['admin-users', 'admin-roles', 'admin-boards'];
const DEFAULT_THEME: ThemePreference = 'system';

// 현재 hydrate 된 userId — null이면 자동 저장 비활성
let currentUserId: string | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  activePanel: null,
  activeFullScreen: null,
  isRightPanelOpen: true,
  rpTab: 'home',
  isAdminMode: false,
  hasUnreadAi: false,
  pinnedMenusUser: DEFAULT_PINNED_USER,
  pinnedMenusAdmin: DEFAULT_PINNED_ADMIN,
  settingsCategory: 'account',
  lastUserMessage: null,
  themePreference: DEFAULT_THEME,
  assistantStage: 'medium',
  assistantMode: 'quickAction',
  chatResetCounter: 0,
  assistantContextCards: [],
  assistantContextSeen: false,
  isCustomizationOpen: false,
  previousFullScreen: null,
  boardLpHandoff: null,

  handleNavClick: (panel) => {
    if (panel === 'home') {
      set({ activePanel: null, activeFullScreen: null });
      return;
    }
    set((state) => ({
        activeFullScreen : state.isAdminMode ? panel : state.activeFullScreen,
        activePanel: state.isAdminMode ? null : state.activePanel === panel ? null : panel,
    }));
  },

  openFullScreen: () => {
    const { activePanel } = get();
    if (activePanel) {
      set({ activeFullScreen: activePanel });
    }
  },

  openSettingsScreen: () => {
    set({ activePanel: null, activeFullScreen: 'settings' });
  },

  goHome: () => set({ activePanel: null, activeFullScreen: null }),

  closeLeftPanel: () => set({ activePanel: null }),

  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),

  toggleAdminMode: () =>
    set((s) => ({
      isAdminMode: !s.isAdminMode,
      activePanel: null,
      activeFullScreen: null,
    })),

  setRpTab: (tab) => {
    set({ rpTab: tab });
    if (tab === 'ai') {
      set({ hasUnreadAi: false });
    }
  },

  markAiUnread: () => set({ hasUnreadAi: true }),
  markAiRead: () => set({ hasUnreadAi: false }),
  setLastUserMessage: (message) => set({ lastUserMessage: message }),

  togglePinnedMenu: (panel, maxCount) =>
    set((s) => {
      const isAdmin = s.isAdminMode;
      const current = isAdmin ? s.pinnedMenusAdmin : s.pinnedMenusUser;
      if (current.includes(panel)) {
        const next = current.filter((p) => p !== panel);
        return isAdmin ? { pinnedMenusAdmin: next } : { pinnedMenusUser: next };
      }
      if (current.length >= maxCount) return s;
      const next = [...current, panel];
      return isAdmin ? { pinnedMenusAdmin: next } : { pinnedMenusUser: next };
    }),

  reorderPinnedMenus: (from, to) =>
    set((s) => {
      const isAdmin = s.isAdminMode;
      const current = isAdmin ? s.pinnedMenusAdmin : s.pinnedMenusUser;
      const arr = [...current];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return isAdmin ? { pinnedMenusAdmin: arr } : { pinnedMenusUser: arr };
    }),

  setSettingsCategory: (category) => set({ settingsCategory: category }),

  setThemePreference: (pref) => set({ themePreference: pref }),

  setAssistantStage: (stage) =>
    set((s) => ({
      assistantStage: stage,
      ...(stage === 'medium' || stage === 'full' ? { assistantContextSeen: true } : {}),
    })),

  setActiveFullScreen: (panelId) =>
    set((s) => {
      // 메뉴 패널 진입 시 직전 위치 기억 (사용자가 어디 있었는지 시각 표시용)
      if (panelId === 'menu-panel') {
        return {
          activeFullScreen: panelId,
          previousFullScreen: s.activeFullScreen,
        };
      }
      // 다른 풀뷰로 전환 또는 홈 복귀 시 직전 위치 리셋
      return {
        activeFullScreen: panelId,
        previousFullScreen: null,
      };
    }),

  setCustomizationOpen: (open) => set({ isCustomizationOpen: open }),

  setBoardLpHandoff: (handoff) => set({ boardLpHandoff: handoff }),

  setAssistantMode: (mode) => set({ assistantMode: mode }),

  setAssistantContext: (cards) =>
    set({ assistantContextCards: cards, assistantContextSeen: false }),

  resetChat: () => {
    set((s) => ({
      lastUserMessage: null,
      assistantMode: 'quickAction',
      assistantContextCards: [],
      assistantContextSeen: false,
      chatResetCounter: s.chatResetCounter + 1,
    }));
  },

  hydrateFromStorage: async (userId) => {
    // 일단 이전 저장 트리거를 막기 위해 currentUserId를 비워둠
    currentUserId = null;
    try {
      const stored = await AsyncStorage.getItem(storageKey(userId));
      const next: Partial<UiState> = {
        // 다른 사용자 데이터 잔재 방지: 못 읽은 필드는 디폴트로
        pinnedMenusUser: DEFAULT_PINNED_USER,
        pinnedMenusAdmin: DEFAULT_PINNED_ADMIN,
        themePreference: DEFAULT_THEME,
      };
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // 옛 저장값에 폐기된 panelId('admin-home' 등)가 들어 있을 수 있어
          // ALL_MENUS에 존재하는 panelId만 통과시키는 방어 필터.
          const validPanels = new Set(ALL_MENUS.map((m) => m.panel));
          if (Array.isArray(parsed?.pinnedMenusUser)) {
            next.pinnedMenusUser = (parsed.pinnedMenusUser as string[])
              .filter((p) => validPanels.has(p as PanelId)) as PanelId[];
          }
          if (Array.isArray(parsed?.pinnedMenusAdmin)) {
            next.pinnedMenusAdmin = (parsed.pinnedMenusAdmin as string[])
              .filter((p) => validPanels.has(p as PanelId)) as PanelId[];
          }
          if (
            parsed?.themePreference &&
            ['light', 'dark', 'system'].includes(parsed.themePreference)
          ) {
            next.themePreference = parsed.themePreference as ThemePreference;
          }
          // 옛 형태(단일 pinnedMenus 배열)는 호환 매핑하지 않고 디폴트 유지
        } catch (_) {
          // 깨진 JSON은 디폴트 유지
        }
      }
      useUiStore.setState(next);
    } catch (_) {
      // AsyncStorage 접근 실패 — 디폴트 유지
      useUiStore.setState({
        pinnedMenusUser: DEFAULT_PINNED_USER,
        pinnedMenusAdmin: DEFAULT_PINNED_ADMIN,
        themePreference: DEFAULT_THEME,
      });
    }
    // hydrate 완료 — 이후 변경은 자동 저장 대상
    currentUserId = userId;
  },

  resetUiToDefaults: () => {
    // AsyncStorage는 건드리지 않음 — 다음 같은 사용자 재로그인 시 hydrate로 복원됨
    currentUserId = null;
    set({
      // hydrate 대상
      pinnedMenusUser: DEFAULT_PINNED_USER,
      pinnedMenusAdmin: DEFAULT_PINNED_ADMIN,
      themePreference: DEFAULT_THEME,
      // UI 일시 상태 — 합리적 디폴트
      activePanel: null,
      activeFullScreen: null,
      isRightPanelOpen: true,
      rpTab: 'home',
      isAdminMode: false,
      hasUnreadAi: false,
      settingsCategory: 'account',
      lastUserMessage: null,
      assistantStage: 'medium',
      assistantMode: 'quickAction',
      assistantContextCards: [],
      assistantContextSeen: false,
      isCustomizationOpen: false,
      previousFullScreen: null,
      boardLpHandoff: null,
    });
  },
}));

// 셀렉터: 현재 모드의 핀 배열 반환
export const selectPinnedForMode = (s: UiState): PanelId[] =>
  s.isAdminMode ? s.pinnedMenusAdmin : s.pinnedMenusUser;

// pinnedMenusUser/pinnedMenusAdmin/themePreference 변경 시 자동 저장
let prevPinnedUser = useUiStore.getState().pinnedMenusUser;
let prevPinnedAdmin = useUiStore.getState().pinnedMenusAdmin;
let prevThemePreference = useUiStore.getState().themePreference;
useUiStore.subscribe((state) => {
  const userPinChanged = state.pinnedMenusUser !== prevPinnedUser;
  const adminPinChanged = state.pinnedMenusAdmin !== prevPinnedAdmin;
  const themeChanged = state.themePreference !== prevThemePreference;
  if (userPinChanged || adminPinChanged || themeChanged) {
    prevPinnedUser = state.pinnedMenusUser;
    prevPinnedAdmin = state.pinnedMenusAdmin;
    prevThemePreference = state.themePreference;
    if (currentUserId) {
      AsyncStorage.setItem(
        storageKey(currentUserId),
        JSON.stringify({
          pinnedMenusUser: state.pinnedMenusUser,
          pinnedMenusAdmin: state.pinnedMenusAdmin,
          themePreference: state.themePreference,
        }),
      ).catch(() => {
        // 저장 실패는 조용히 무시
      });
    }
  }
});
