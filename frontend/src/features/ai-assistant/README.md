# ai-assistant — AI 컨텍스트 패널

## 책임
사용자가 채팅창에 메시지를 보내면, 해당 의도를 분류하여 RP AI 탭에 관련 액션·문서·현황 카드를 자동으로 표시한다.

## 디렉토리 구조

```
features/ai-assistant/
├── types.ts                  # AssistantCard, AssistantResponse, CardType 타입 정의
├── api.ts                    # 더미 데이터 + classifyIntent + getAssistantResponse + useAssistantContext
├── components/
│   ├── ActionCard.tsx        # 업무 바로가기 카드 (아이콘 + 제목 + ChevronRight)
│   ├── InfoCard.tsx          # 문서 정보 카드 (제목 + 태그 + bullet + 전체보기)
│   ├── StatusCard.tsx        # 현황 카드 (아이콘 박스 + 강조 수치)
│   └── AssistantPanel.tsx    # 패널 컨테이너 (empty state + 카드 섹션 렌더링)
└── README.md
```

## 외부 의존성

| 단계 | 상태 |
|------|------|
| Phase 1 (현재) | `getAssistantResponse(message)` — 키워드 기반 더미 데이터 동기 반환 |
| Phase 2 (예정) | FastAPI SSE 응답에서 `AssistantResponse` 수신 → `useAssistantContext` 훅으로 교체 |

## 백엔드 응답 형식 (Phase 2 연결 시)

```typescript
type CardType = 'action' | 'info' | 'status';

interface AssistantCard {
  type: CardType;
  icon: string;          // lucide 아이콘 이름 (예: 'Car', 'FileText')
  title: string;
  link?: string;         // action: 이동 경로
  subtitle?: string;     // action: 보조 설명
  summaryItems?: string[]; // info: bullet 리스트
  summary?: string;      // info: 단일 텍스트 (summaryItems 우선)
  fullLink?: string;     // info: 전체보기 경로
  tag?: string;          // info: 태그 레이블
  tagColor?: string;     // info: 태그 색상 hex
  value?: string;        // status: 강조 표시할 값
}

interface AssistantResponse {
  intent: string;        // 'vacation' | 'vehicle' | 'meeting' | ...
  cards: AssistantCard[];
}
```

## 통합 방식

```tsx
// layout/RightPanelAI.tsx
import { useUiStore } from '../store/uiStore';
import { AssistantPanel } from '../features/ai-assistant/components/AssistantPanel';

export function RightPanelAI() {
  const lastUserMessage = useUiStore((s) => s.lastUserMessage);
  return <AssistantPanel lastUserMessage={lastUserMessage} userName="" />;
}

// features/chat/screens/MainScreen.tsx — 메시지 전송 시
const setLastUserMessage = useUiStore((s) => s.setLastUserMessage);
const markAiUnread = useUiStore((s) => s.markAiUnread);

// sendMessage 내부
setLastUserMessage(text.trim());  // 전송 즉시 → AssistantPanel 업데이트
// ...finally
markAiUnread();                   // AI 응답 완료 → RP 탭 빨간점 표시
```

## 지원 도메인 (Phase 1)

| 도메인 | 키워드 |
|--------|--------|
| vacation | 휴가, 연차, 반차, 월차 |
| vehicle | 차량, 차를, 법인차, 렌터카 |
| meeting | 회의실, 미팅룸 |
| approval | 결재, 품의, 승인 |
| report | 주간보고, 보고서 |
| certificate | 증명서, 재직, 경력증명 |
| education | 교육, 연수 |
| purchase | 비품, 구매, 노트북 |
| trip | 출장, 출장비 |

## 로드맵

- **Phase 1** (현재): 키워드 기반 더미 데이터. 카드 UI 골격 완성.
- **Phase 2**: FastAPI SSE `meta` 이벤트에 `AssistantResponse` 포함 → `useAssistantContext` 실제 API 연결.
- **Phase 3**: 카드 클릭 시 실제 라우팅 연결 (현재는 Alert 시뮬레이션).
