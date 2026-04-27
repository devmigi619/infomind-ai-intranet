import { useState, useCallback } from 'react';
import type { PanelId, RpTab } from '../types';

export function usePanel() {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [activeFullScreen, setActiveFullScreen] = useState<PanelId | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rpTab, setRpTabState] = useState<RpTab>('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [hasUnreadAi, setHasUnreadAi] = useState(false);

  // NavRail menu click — toggle behavior
  // NOTE: Per UX rule, NavRail menu click only affects LP (activePanel).
  // It does NOT touch activeFullScreen. Fullscreen only changes via:
  //   - "열기" button (openFullScreen)
  //   - Home click / Brand click (goHome)
  //   - Admin mode toggle
  const handleNavClick = useCallback((panel: PanelId | 'home') => {
    if (panel === 'home') {
      setActivePanel(null);
      setActiveFullScreen(null);
      return;
    }
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  // LeftPanel "open" button — promote activePanel to fullscreen
  // NOTE: Per UX rule, do NOT auto-close LP/RP. Only set fullscreen.
  const openFullScreen = useCallback(() => {
    setActivePanel((currentPanel) => {
      if (currentPanel) {
        setActiveFullScreen(currentPanel);
      }
      return currentPanel;
    });
  }, []);

  // Brand click — return to AI chat home, keep RightPanel as-is
  const goHome = useCallback(() => {
    setActivePanel(null);
    setActiveFullScreen(null);
  }, []);

  // LeftPanel close button
  const closeLeftPanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  // RightPanel toggle
  const toggleRightPanel = useCallback(() => {
    setIsRightPanelOpen((prev) => !prev);
  }, []);

  // Admin mode toggle — resets active panels
  const toggleAdminMode = useCallback(() => {
    setIsAdminMode((prev) => !prev);
    setActivePanel(null);
    setActiveFullScreen(null);
  }, []);

  // AI unread state
  const markAiUnread = useCallback(() => {
    setHasUnreadAi(true);
  }, []);

  const markAiRead = useCallback(() => {
    setHasUnreadAi(false);
  }, []);

  // Wrap setRpTab so switching to 'ai' clears the unread flag
  const setRpTab = useCallback((tab: RpTab) => {
    setRpTabState(tab);
    if (tab === 'ai') {
      setHasUnreadAi(false);
    }
  }, []);

  return {
    activePanel,
    activeFullScreen,
    isRightPanelOpen,
    rpTab,
    isAdminMode,
    hasUnreadAi,
    setRpTab,
    handleNavClick,
    openFullScreen,
    goHome,
    closeLeftPanel,
    toggleRightPanel,
    toggleAdminMode,
    markAiUnread,
    markAiRead,
  };
}
