# 게시판 모듈

## 개요

다중 게시판(Board) 기반 게시판 시스템. 백엔드 `INT_BRD`(게시판) / `INT_PST`(글) / `INT_PST_CMT`(댓글) 테이블과 1:1 매핑.

- 게시판 ID(`brdId`)로 게시판 구분, 종류(`brdSe`)로 공지/일반 식별 (`brdSe='NOTICE'` 또는 `brdNm='공지사항'`이 공지 게시판)
- 글의 공지 여부는 `ntcYn='Y'` 플래그 — 백엔드가 `ntcYn DESC, pstSn DESC`로 정렬 반환
- 인증 통합 전이라 글/댓글 생성 시 `userId`를 body에 직접 전달, 삭제 시 `{ userId, admin }` 전달

## 디렉토리

```
features/board/
├── README.md
├── api.ts                                # HTTP 함수 + React Query 훅 + 타입
├── screens/
│   └── BoardScreen.tsx                   # 풀뷰 (list ↔ detail ↔ write 화면 교체)
└── components/
    └── BoardQuickPanel.tsx               # LP 퀵뷰 (list ↔ detail 내부 토글)
```

## 화면 상태

### 풀뷰 — `BoardScreen`
- 단일 화면, 한 컬럼 (좌우 분할 X — LP/RP와 겹침 회피)
- 상태 머신: `list ↔ detail ↔ write`
- PC: 테이블 형식, 모바일: 카드 형식 (`useResponsive().isMobile` 분기)
- `uiStore.boardLpHandoff`를 읽어 LP에서 넘어온 컨텍스트 자동 적용

### LP 퀵뷰 — `BoardQuickPanel`
- 자체 상태: `list ↔ detail` (LP 내부 토글, 풀뷰 진입 X)
- list: 공지사항 게시판의 NTC `Y` 2개 + 일반 3개, 최대 5개
- 열기 버튼: `setBoardLpHandoff()` + `setActiveFullScreen('board')`

## API

`/api/boards` 계열. 응답은 모두 `{ success, data, message }` 래퍼.

- `GET    /api/boards`                                   게시판 목록
- `GET    /api/boards/{brdId}/posts`                     게시판 내 글 목록
- `GET    /api/boards/{brdId}/posts/{pstSn}`             글 상세 (호출 시 조회수 증가)
- `POST   /api/boards/{brdId}/posts`                     글 작성 — body: `{ pstTtl, pstDesc, userId, ntcYn? }`
- `PUT    /api/boards/{brdId}/posts/{pstSn}`             글 수정
- `DELETE /api/boards/{brdId}/posts/{pstSn}`             소프트 삭제 — body: `{ userId, admin }`
- `POST   /api/boards/{brdId}/posts/{pstSn}/like`        좋아요 +1
- `GET    /api/boards/{brdId}/posts/{pstSn}/comments`    댓글 목록
- `POST   /api/boards/{brdId}/posts/{pstSn}/comments`    댓글 작성 — body: `{ cmtDesc, userId, cmtLvl?, upCmtSn? }`
- `PUT    /api/boards/{brdId}/posts/{pstSn}/comments/{cmtSn}` 댓글 수정
- `DELETE /api/boards/{brdId}/posts/{pstSn}/comments/{cmtSn}` 댓글 소프트 삭제 — body: `{ userId, admin }`

## 핵심 타입

```typescript
interface Board {
  brdId: string;
  brdSe: string;       // 'NOTICE' 등 게시판 종류
  brdNm: string;
  // ...
}

interface Post {
  brdId: string;
  pstSn: number;
  pstTtl: string;
  pstDesc: string;
  userId: string;
  ntcYn: string;       // 'Y' 면 공지 (목록 상단 고정 + 시각 강조)
  qryCnt: number;
  likeNum: number;
  crtAt: string;
  // ...
}

interface PostComment {
  brdId: string;
  pstSn: number;
  cmtSn: number;
  cmtLvl: number;      // 1 = 댓글, 2 = 대댓글
  upCmtSn?: number;    // 대댓글일 때 부모 cmtSn
  cmtDesc: string;
  userId: string;
  // ...
}
```

## React Query 훅

| 훅 | 설명 |
|---|---|
| `useBoards()` | 게시판 목록 |
| `useBoardPosts(brdId)` | 게시판 내 글 목록 |
| `usePostDetail(brdId, pstSn)` | 글 상세 (`staleTime=0` — 조회수 매번 갱신) |
| `useCreatePost()` | 글 작성 |
| `useUpdatePost()` | 글 수정 |
| `useDeletePost()` | 글 삭제 |
| `useLikePost()` | 좋아요 +1 |
| `usePostComments(brdId, pstSn)` | 댓글 목록 |
| `useCreateComment()` | 댓글/대댓글 작성 |
| `useUpdateComment()` | 댓글 수정 |
| `useDeleteComment()` | 댓글 삭제 |

각 mutation 성공 시 관련 쿼리 invalidate.

## NTC 핀 시각화

- PC 목록: 행 좌측에 빨간 "공지" 뱃지 + 행 배경 `rgba(220,38,38,0.03)`
- 모바일 카드: 카드 상단 좌측에 빨간 "공지" 뱃지
- LP 미리보기: 제목 앞에 📌 (NTC=Y인 항목만)

## 권한

- 수정: 작성자(`post.userId === currentUser.userId`)만
- 삭제: 작성자 또는 admin(`isAdminMode === true`)

## 댓글 대댓글 트리

- 백엔드는 flat 리스트 반환 — 클라이언트가 `cmtLvl`/`upCmtSn` 보고 정렬·들여쓰기
- 트리 깊이는 2단계까지만 가정
- 대댓글 시각화: `↳` 아이콘 + 좌측 margin 32 + 좌측 2px brand-tint 보더 + 헤더에 `@부모작성자에게`
