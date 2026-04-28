# 인증 모듈

## 개요

JWT 기반 로그인/로그아웃 및 토큰 자동 갱신.

- AsyncStorage에 `token`, `refreshToken`, `user` 저장
- axios 인터셉터가 401 시 자동 refresh 후 재시도

## 디렉토리

```
features/auth/
├── README.md
├── api.ts                      # HTTP 함수 + React Query 훅 + User 타입
└── screens/
    └── LoginScreen.tsx         # 로그인 화면
```

## 인터페이스

### `LoginScreen`

```typescript
function LoginScreen(): JSX.Element; // props 없음
```

로그인 성공 시 React Query 캐시(`['auth', 'currentUser']`)에 User를 세팅하고
App.tsx가 이를 감지하여 메인 화면으로 전환.

## 데이터 타입

```typescript
interface User {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}
```

## 구현된 훅

- `useCurrentUser()` — AsyncStorage에서 저장된 사용자 복원 (staleTime: Infinity)
- `useLogin()` — 로그인 + 토큰 저장 + 캐시 세팅
- `useLogout()` — 토큰 삭제 + 캐시 초기화

## API

- `POST /api/auth/login` body: `{ username, password }` → `{ data: { token, refreshToken, user } }`
- `POST /api/auth/refresh` body: `{ refreshToken }` → `{ data: { token } }`

## 참고

- 토큰 인터셉터: `shared/api/client.ts`
- JWT 검증은 Spring Boot에서만 수행. FastAPI는 `JWT_SECRET`으로 자체 검증 (`ai/app/core/auth.py`)
