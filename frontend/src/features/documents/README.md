# 자료실 모듈 (Phase 3)

## 개요

사내 문서 자료실.

- 문서 업로드 및 목록 조회
- Phase 3 RAG와 연계 — 업로드된 문서를 AI 채팅에서 검색 가능

## 디렉토리 (예정)

```
features/documents/
├── README.md
├── api.ts                        # 자료실 API + 훅 (Phase 3에서 구현)
├── screens/
│   └── DocumentsScreen.tsx       # 풀뷰 (카테고리별 문서 목록 + 업로드)
└── panels/
    └── DocumentsPanel.tsx        # LP 퀵뷰 (최근 등록 문서)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `DocumentsPanel`

```typescript
interface DocumentsPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 최근 등록된 문서 5건
- "자료실 열기" 버튼

## 데이터 타입 (예정)

```typescript
interface Document {
  id: number;
  title: string;
  category: string;
  uploaderName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}
```

## API (예정)

- `GET /api/documents?category&page&size`
- `POST /api/documents` (multipart/form-data)
- `DELETE /api/documents/{id}`

## RAG 연계 (Phase 3)

업로드된 문서는 FastAPI를 통해 Qdrant에 벡터 인덱싱됨.
AI 채팅(`features/chat`)에서 문서 기반 답변 제공.

## 현재 상태

- [ ] Phase 3에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
