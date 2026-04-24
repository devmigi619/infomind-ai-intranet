import { useState, useCallback } from 'react';
import type { PanelType } from '@/types';

export function usePanel() {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  return {
    activePanel,
    openPanel,
    closePanel,
    togglePanel,
  };
}
