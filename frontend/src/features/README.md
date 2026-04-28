# 모듈 협업 가이드

## 디렉토리 구조

각 모듈은 `features/{module}/` 안에 자급자족.

```
features/{module}/
├── README.md           # 모듈 인터페이스 명세
├── api.ts              # HTTP 함수 + React Query 훅 + 타입
├── screens/            # 풀뷰
│   └── {Module}Screen.tsx
├── panels/             # LP 퀵뷰
│   └── {Module}Panel.tsx
└── components/         # 모듈 내부 컴포넌트 (재사용 안 됨)
```

## 모듈 목록

| 모듈     | 경로                    | 상태         |
| -------- | ----------------------- | ------------ |
| 게시판   | `features/board/`       | Phase 1 완료 |
| 전자결재 | `features/approval/`    | Phase 1 완료 |
| 주간보고 | `features/report/`      | Phase 1 완료 |
| 인증     | `features/auth/`        | Phase 1 완료 |
| AI 채팅  | `features/chat/`        | Phase 1 완료 |
| 사용자   | `features/users/`       | Phase 1 완료 |
| 캘린더   | `features/calendar/`    | Phase 2 예정 |
| 회의실   | `features/meeting/`     | Phase 2 예정 |
| 차량     | `features/vehicle/`     | Phase 2 예정 |
| 주소록   | `features/contacts/`    | Phase 2 예정 |
| 자료실   | `features/documents/`   | Phase 3 예정 |
| 증명서   | `features/certificate/` | Phase 3 예정 |

## 새 모듈 추가 시

1. 위 디렉토리 구조로 폴더 생성
2. `README.md` 작성 (인터페이스 명세)
3. `shared/constants/menus.ts`의 `ALL_MENUS`에 등록
4. `types/index.ts`의 `PanelId`에 추가
5. `App.tsx`의 `renderMain()` switch에 추가
6. `App.tsx`의 `PLACEHOLDER_TITLES`에 추가

## API + 훅 패턴

- HTTP 함수와 React Query 훅을 `api.ts` 한 파일에 통합
- mutation 시 `onSuccess`에서 `qc.invalidateQueries(...)`로 캐시 무효화
- 타입(interface)은 같은 파일에 export

```typescript
// api.ts 패턴 예시
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface MyType { ... }

const myApi = {
  getList: (): Promise<MyType[]> =>
    apiClient.get('/api/my-resource').then((r) => r.data?.data ?? []),
  create: (data: unknown) =>
    apiClient.post('/api/my-resource', data).then((r) => r.data.data),
};

export const useMyList = () =>
  useQuery({ queryKey: ['my-resource'], queryFn: myApi.getList });

export const useCreateMy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: myApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-resource'] }),
  });
};

export { myApi };
```

## 디자인 토큰

새 코드는 `shared/constants/`의 토큰 사용 (colors, spacing, radius, typography, shadows 등).
기존 컴포넌트의 하드코딩 값은 점진적으로 마이그레이션.

```typescript
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
```

## 컴포넌트 위치 결정

- 모듈 내부에서만 재사용 → `features/{module}/components/`
- 여러 모듈에서 재사용 → `shared/components/`
- 앱 레이아웃 (NavRail/LeftPanel 등) → `layout/`
