# ai-context — 자비스패널 (사물 채널 렌더러)

## 책임

SSE `ai_context` 이벤트의 스냅샷을 무상태로 렌더링한다. 채팅창(언어 채널)과 분리된 **사물 채널**의 PC 구현체.
패널은 데이터를 소유하지 않는다 — 매 이벤트가 전체 화면이며, 패치·병합 없음.

## 디렉토리 구조

```
features/ai-context/
├── types.ts                  # AiContextPayload, AiContextArtifact, AiContextBlock 등 (백엔드 snake_case 보존)
├── store.ts                  # useAiContextStore — snapshot 보관 (NO persist)
├── components/
│   └── AiContextPanel.tsx    # 패널 컨테이너 (도메인 배너 + ArtifactCard + BlockRow)
└── README.md
```

## 계약 요약

### Payload 모양

```typescript
{
  type: 'ai_context';
  domain: string;              // 'leave' | 'mtgr' | 'veh' | ...
  artifact?: AiContextArtifact | null;
  blocks: AiContextBlock[];    // kind: 'fact' | 'action' | ... (전방 호환)
}
```

### 스냅샷 의미론

- **매 이벤트가 전체 화면.** 패치/병합 없음 — 새 스냅샷이 오면 이전 화면 전체를 교체한다.
- **artifact 읽기 전용 원칙.** 패널에서 필드를 수정할 수 없다. 수정은 채팅으로 말하거나 메인 페이지에서 직접 한다.
- **모르는 `kind`는 건너뜀.** 구버전 앱 + 신버전 서버 안전 (전방 호환).

### 합류 방식

artifact 제출/취소 버튼은 `useChatStore.getState().setPendingResumeValue(...)` 를 호출한다.
이 값은 MainScreen이 감지해 `/chat/resume` 로 전송한다 (chatStore에 별도 추가).

## 설계 문서

`ai/migi/jarvis-panel-design.md`

## 주의

`uiStore`의 `setAiContext(intent, actionType)`(동료 구현, 의도 메타 저장용)과 **이름이 비슷하나 별개 모듈**이다.
`setAiContext`는 ai-assistant 패널의 intent/actionType 메타를 관리하며, 이 모듈(`ai-context`)과 무관하다.
