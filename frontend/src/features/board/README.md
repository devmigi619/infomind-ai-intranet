# 게시판 모듈

## 개요

공지사항 + 자유게시판 + QnA가 통합된 카테고리 게시판.

- 공지(NOTICE), 자유(FREE), QnA(QNA) 세 카테고리
- 공지 가시성은 RP 홈 탭의 "최근 공지" 카드로도 보강

## 디렉토리

```
features/board/
├── README.md
├── api.ts                    # HTTP 함수 + React Query 훅 + 타입
├── screens/
│   └── BoardScreen.tsx       # 풀뷰 (목록/상세/작성)
├── panels/
│   └── BoardPanel.tsx        # LP 퀵뷰 ⚠️ 구현 필요
└── components/               # 모듈 내부 재사용 컴포넌트 (필요 시)
```

## 인터페이스

### LP 퀵뷰 — `BoardPanel`

```typescript
interface BoardPanelProps {
  onOpenFullScreen: () => void; // "열기" 버튼 클릭 시 호출
  onClose: () => void; // ✕ 닫기
}
```

표시 내용 (가이드):

- 카테고리 필터 칩 (전체/공지/자유/QnA)
- 최근 글 5건 (제목 + 작성자 + 날짜)
- "글 작성" 버튼 (선택)

### 풀뷰 — `BoardScreen`

```typescript
function BoardScreen(): JSX.Element; // props 없음, 자체 fetch
```

## API

- `GET /api/posts?page&size&category` → `{ data: { content: Post[] } }`
- `GET /api/posts/{id}` → `{ data: Post }`
- `POST /api/posts` (body: `{ title, content, category }`) → `{ data: Post }`
- `PUT /api/posts/{id}` → `{ data: Post }`
- `DELETE /api/posts/{id}` → 204

## 데이터 타입

```typescript
interface Post {
  id: number;
  title: string;
  category: 'NOTICE' | 'FREE' | 'QNA';
  authorName: string;
  viewCount: number;
  createdAt: string;
  content: string;
}
```

## 구현된 훅

- `useBoardList(page, category)` — 목록 조회
- `useBoardDetail(id)` — 단건 조회
- `useCreatePost()` — 글 작성

## 미구현 훅 (필요 시 추가)

- `useUpdatePost()` — 글 수정
- `useDeletePost()` — 글 삭제

## 향후 작업

- [ ] BoardPanel (LP 퀵뷰) 컴포넌트 작성
- [ ] 풀뷰 디자인 정비 (4단계에서)
- [ ] 글 수정/삭제 기능
