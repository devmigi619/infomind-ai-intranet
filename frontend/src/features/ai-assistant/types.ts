// ─── Card Types ───────────────────────────────────────────────────────────────

export type CardType = 'action' | 'info' | 'status';

export interface AssistantCard {
  type: CardType;
  /** lucide-react-native 아이콘 이름 (예: 'Car', 'FileText') */
  icon: string;
  title: string;
  // action 전용
  link?: string;
  subtitle?: string;
  // info 전용
  summary?: string;
  summaryItems?: string[];
  fullLink?: string;
  tag?: string;
  tagColor?: string;
  // status 전용
  value?: string;
}

export interface AssistantResponse {
  intent: string;
  cards: AssistantCard[];
}
