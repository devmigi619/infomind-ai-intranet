import React from 'react';
import { useUiStore } from '../store/uiStore';
import { AssistantPanel } from '../features/ai-assistant/components/AssistantPanel';

export function RightPanelAI() {
  const lastUserMessage = useUiStore((s) => s.lastUserMessage);

  return <AssistantPanel lastUserMessage={lastUserMessage} userName="" />;
}
