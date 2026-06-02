export interface ActionLink {
  label: string;
  target: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionLink[];
  isStreaming?: boolean;
  isThinking?: boolean;
  interruptType?: 'human' | 'excu';
  progressSteps?: string[]; // detail_status 누적 (thinking 단계 동안만 유지)
}
