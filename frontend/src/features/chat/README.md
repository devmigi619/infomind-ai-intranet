# AI 채팅 모듈

## 개요

Ollama 기반 AI 어시스턴트와의 대화. SSE 스트리밍으로 토큰 단위 응답.

- 의도 분류 (결재/게시판/주간보고/일반)
- 의도에 따른 바로가기 액션 링크 반환

## 디렉토리

```
features/chat/
├── README.md
└── screens/
    └── MainScreen.tsx   # AI 채팅 메인 화면 (앱의 중심 화면)
```

## 인터페이스

### `MainScreen`

```typescript
interface MainScreenProps {
  user: { name: string } | null;
  onNavigate: (tabId: string) => void; // AI 바로가기 액션 클릭 시
  onAiResponseComplete?: () => void; // 응답 완료 시 RP AI 탭 알림용
}
```

## SSE 스트리밍 명세

### 엔드포인트

`POST /ai/chat`

### 요청

```json
{
  "message": "휴가 신청하고 싶어",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### 응답 이벤트 스트림

```
data: {"type": "meta", "actions": [{"label": "전자결재 열기", "target": "approval"}]}

data: {"type": "token", "content": "휴가"}

data: {"type": "token", "content": " 신청은"}

data: {"type": "done"}
```

| 이벤트 타입 | 설명                                |
| ----------- | ----------------------------------- |
| `meta`      | 바로가기 액션 목록 (첫 번째로 수신) |
| `token`     | 스트리밍 텍스트 토큰                |
| `done`      | 스트리밍 완료 신호                  |

### 인증

`Authorization: Bearer {jwt}` 헤더 필요.

## 향후 작업

- [ ] 채팅 히스토리 영속화 (현재는 메모리만)
- [ ] Phase 3 RAG 연동 — 자료실 문서 기반 답변
