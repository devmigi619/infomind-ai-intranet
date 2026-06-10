export interface ActionLink {
  label: string;
  target: string;
}

/** interrupt 패널에서 렌더링할 동적 폼 필드 정의 */
export interface FormField {
  key: string;
  label: string;
  type: 'textarea' | 'text' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  /** 기존 데이터 pre-load용 초기값. 백엔드가 context에서 추출해 주입한다 */
  value?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionLink[];
  isStreaming?: boolean;
  isThinking?: boolean;
  progressSteps?: string[]; // detail_status 누적 (thinking 단계 동안만 유지)
  /** human: 채팅 하단 InterruptReplyPanel / excu: 패널 실행확인 / form: 패널 폼 입력 */
  interruptType?: 'human' | 'excu' | 'form';
}
