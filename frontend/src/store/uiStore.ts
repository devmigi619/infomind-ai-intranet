import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PanelId, RpTab } from '../types';

// zustand v5의 persist 미들웨어가 import.meta를 사용하는데
// Expo Web의 Hermes 엔진이 import.meta를 지원하지 않아 별도 구현.
const STORAGE_KEY = 'infomind-ui';

interface UiState {
  // State
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isRightPanelOpen: boolean;
  rpTab: RpTab;
  isAdminMode: boolean;
  hasUnreadAi: boolean;
  pinnedMenus: PanelId[];

  // Actions
  handleNavClick: (panel: PanelId | 'home') => void;
  openFullScreen: () => void;
  goHome: () => void;
  closeLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleAdminMode: () => void;
  setRpTab: (tab: RpTab) => void;
  markAiUnread: () => void;
  markAiRead: () => void;
  togglePinnedMenu: (panel: PanelId) => void;
  reorderPinnedMenus: (from: number, to: number) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activePanel: null,
  activeFullScreen: null,
  isRightPanelOpen: true,
  rpTab: 'home',
  isAdminMode: false,
  hasUnreadAi: false,
  pinnedMenus: ['board', 'approval', 'report', 'calendar'],

  handleNavClick: (panel) => {
    if (panel === 'home') {
      set({ activePanel: null, activeFullScreen: null });
      return;
    }
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    }));
  },

  openFullScreen: () => {
    const { activePanel } = get();
    if (activePanel) {
      set({ activeFullScreen: activePanel });
    }
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

  togglePinnedMenu: (panel) =>
    set((s) => {
      if (s.pinnedMenus.includes(panel)) {
        return { pinnedMenus: s.pinnedMenus.filter((p) => p !== panel) };
      }
      if (s.pinnedMenus.length >= 7) return s;
      return { pinnedMenus: [...s.pinnedMenus, panel] };
    }),

  reorderPinnedMenus: (from, to) =>
    set((s) => {
      const arr = [...s.pinnedMenus];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { pinnedMenus: arr };
    }),
}));

// 비동기 hydrate (앱 시작 시 LocalStorage/AsyncStorage에서 pinnedMenus 복원)
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.pinnedMenus && Array.isArray(parsed.pinnedMenus)) {
        useUiStore.setState({ pinnedMenus: parsed.pinnedMenus });
      }
    } catch (_) {
      // 깨진 JSON은 무시
    }
  })
  .catch(() => {
    // AsyncStorage 접근 실패는 무시 (디폴트 값 사용)
  });

// pinnedMenus 변경 시 AsyncStorage에 저장
let prevPinnedMenus = useUiStore.getState().pinnedMenus;
useUiStore.subscribe((state) => {
  if (state.pinnedMenus !== prevPinnedMenus) {
    prevPinnedMenus = state.pinnedMenus;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pinnedMenus: state.pinnedMenus })).catch(
      () => {
        // 저장 실패는 조용히 무시
      },
    );
  }
});
