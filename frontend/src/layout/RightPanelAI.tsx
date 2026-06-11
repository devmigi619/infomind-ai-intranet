import React from 'react';
import { useUiStore } from '../store/uiStore';
import { AssistantPanel } from '../features/ai-assistant/components/AssistantPanel';
import { useAiContextStore } from '../features/ai-context/store';
import { AiContextPanel } from '../features/ai-context/components/AiContextPanel';

export function RightPanelAI() {
  const lastUserMessage = useUiStore((s) => s.lastUserMessage);
  // 자비스패널 파일럿 공존 분기: ai_context 스냅샷(leave 도메인)이 있으면
  // 자비스패널, 없으면 기존 ai-assistant 카드 경로
  const snapshot = useAiContextStore((s) => s.snapshot);

  if (snapshot) {
    return <AiContextPanel />;
  }
  return <AssistantPanel lastUserMessage={lastUserMessage} userName="" />;
}
