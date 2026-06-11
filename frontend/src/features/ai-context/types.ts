export interface AiContextField { key: string; label: string; value: string; }
export interface AiContextSubmit { label: string; enabled: boolean; }
export interface AprvLineEntry { aprvUserId: string; aprvUserNm?: string; deptNm?: string; jbgdNm?: string; }
export interface AiContextArtifact {
  kind: string;                 // 'form' (카탈로그 확장형)
  id: string;
  title: string;
  fields: AiContextField[];
  aprvl_list?: AprvLineEntry[] | null;   // 결재선 읽기 전용 표시
  submit: AiContextSubmit;
}
export interface AiContextBlock {
  kind: string;                 // 'fact' | 'action' — 모르는 kind는 렌더 시 건너뜀(전방 호환)
  label: string;
  value?: string | null;        // fact
  screen?: string | null;       // action — setActiveFullScreen 타깃
}
export interface AiContextPayload {
  type: 'ai_context';
  domain: string;
  artifact?: AiContextArtifact | null;
  blocks: AiContextBlock[];
}
