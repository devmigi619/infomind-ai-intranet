import React from 'react';
import { useUiStore } from '../store/uiStore';
import { AssistantPanel } from '../features/ai-assistant/components/AssistantPanel';
import { useAiContextStore } from '../features/ai-context/store';
import { AiContextPanel } from '../features/ai-context/components/AiContextPanel';

export function RightPanelAI() {
  const lastUserMessage = useUiStore((s) => s.lastUserMessage);
  const aiContextEnabled = useUiStore((s) => s.aiContextEnabled);
  // ai_context 스냅샷이 있으면 자비스패널, 없으면 기본 안내 화면을 표시한다.
  const snapshot = useAiContextStore((s) => s.snapshot);

  if (aiContextEnabled) {
    if (snapshot) {
      return <AiContextPanel />;
    }
    return <AssistantPanel lastUserMessage={null} userName="" />;
  }

  return <AssistantPanel lastUserMessage={lastUserMessage} userName="" />;
}
