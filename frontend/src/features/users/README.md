# 사용자 모듈

## 개요

전체 사용자 목록 조회 및 FCM 토큰 업데이트.

- 주로 전자결재 결재선 선택 시 사용자 목록 제공

## 디렉토리

```
features/users/
├── README.md
└── api.ts   # HTTP 함수 + React Query 훅 + UserInfo 타입
```

> 사용자 모듈은 현재 전용 화면 없음. 다른 모듈에서 훅을 import하여 사용.

## 데이터 타입

```typescript
interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}
```

## 구현된 훅

- `useUsers()` — 전체 사용자 목록 (`GET /api/users`)
- `useUpdateFcmToken()` — FCM 토큰 업데이트 (`PUT /api/users/me/fcm-token`)

## API

- `GET /api/users` → `{ data: UserInfo[] }`
- `PUT /api/users/me/fcm-token` body: `{ fcmToken }` → 204

## 향후 작업

- [ ] 내 정보 조회/수정 (`GET/PUT /api/users/me`)
- [ ] 주소록/조직도 화면으로 발전 시 `features/contacts`와 연계 검토
