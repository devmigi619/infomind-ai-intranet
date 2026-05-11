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

## 드롭다운 (선택 필드)

### 공통 컴포넌트: `AppDropdown`

드롭다운이 필요한 모든 곳에서 `shared/components/AppDropdown.tsx`를 사용한다.
React Native 기본 `<select>` 또는 커스텀 모달 구현 **금지**.

```typescript
import { AppDropdown } from '../../../shared/components/AppDropdown';

<AppDropdown
  label="레이블"        // 선택 사항
  required              // 필수 표시 * (선택 사항)
  value={form.field}
  onChange={v => setForm(f => ({ ...f, field: v }))}
  options={myOptions}   // { value: string; label: string }[]
  placeholder="선택"    // 기본값 "선택"
  search                // 항목이 많을 때 검색창 활성화 (선택 사항)
/>
```

- 라이브러리: `react-native-element-dropdown`
- 테마(border, background, brand 색상) 자동 적용
- Web / iOS / Android 모두 동작

### `_SE` 컬럼 — 공통코드에서 목록 가져오기

**`_SE`로 끝나는 컬럼**의 선택 옵션은 항상 공통코드(INT_COM_CODE)에서 가져온다.
하드코딩 금지.

```typescript
import { useCodeList } from '../../../shared/hooks/useCodeList';

// _SE 컬럼명 대문자를 그대로 upCd로 전달
const roleOptions = useCodeList('USER_SE');
// → [{ value: 'ADMIN', label: '관리자' }, { value: 'USER', label: '일반' }]
```

- API: `GET /api/codes/{upCd}` — `USE_YN='Y'`인 활성 코드만 반환
- staleTime 10분 캐시 적용 (공통코드는 자주 변경되지 않음)
- 코드 데이터는 관리자가 **공통코드 관리** 화면에서 직접 등록

### 부서 / 직급 옵션

부서와 직급은 공통코드가 아닌 각자의 전용 API를 사용한다.

```typescript
import { useDepartments } from '../../admin-dept/api';
import { useJobGrades }   from '../../admin-job-grade/api';

const { data: depts  = [] } = useDepartments();
const { data: grades = [] } = useJobGrades();

const deptOptions = [
  { label: '없음', value: '' },
  ...depts.filter(d => d.useYn === 'Y').map(d => ({ label: d.deptNm, value: d.deptCd })),
];
const gradeOptions = [
  { label: '없음', value: '' },
  ...grades.filter(g => g.useYn === 'Y').map(g => ({ label: g.jbgdNm, value: g.jbgdCd })),
];
```

## 디자인 토큰

새 코드는 `shared/constants/`의 토큰 사용 (colors, spacing, radius, typography, shadows 등).
기존 컴포넌트의 하드코딩 값은 점진적으로 마이그레이션.

```typescript
import { colors }  from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
```

## 컴포넌트 위치 결정

- 모듈 내부에서만 재사용 → `features/{module}/components/`
- 여러 모듈에서 재사용 → `shared/components/`
- 앱 레이아웃 (NavRail/LeftPanel 등) → `layout/`
