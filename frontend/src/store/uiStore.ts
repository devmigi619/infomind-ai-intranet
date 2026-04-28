import { create } from 'zustand';
import type { PanelId, RpTab } from '../types';

interface UiState {
  // State
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isRightPanelOpen: boolean;
  rpTab: RpTab;
  isAdminMode: boolean;
  hasUnreadAi: boolean;

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
}

export const useUiStore = create<UiState>((set, get) => ({
  activePanel: null,
  activeFullScreen: null,
  isRightPanelOpen: true,
  rpTab: 'home',
  isAdminMode: false,
  hasUnreadAi: false,

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
}));
