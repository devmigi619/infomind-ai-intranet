# 주소록 모듈 (Phase 2)

## 개요

사내 주소록 및 조직도.

- 부서별 그룹핑
- 가벼운 조회 페이지 (프로필 카드)

## 디렉토리 (예정)

```
features/contacts/
├── README.md
├── api.ts                        # 주소록 API + 훅 (Phase 2에서 구현)
├── screens/
│   └── ContactsScreen.tsx        # 풀뷰 (부서별 목록 + 검색)
└── panels/
    └── ContactsPanel.tsx         # LP 퀵뷰 (즐겨찾기 또는 최근 조회)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `ContactsPanel`

```typescript
interface ContactsPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 즐겨찾기 또는 최근 조회한 연락처
- "전체 주소록" 버튼

## 데이터 타입 (예정)

```typescript
interface Contact {
  id: number;
  name: string;
  department: string;
  position: string;
  email?: string;
  phone?: string;
}

interface Department {
  id: number;
  name: string;
  members: Contact[];
}
```

## API (예정)

- `GET /api/users` → 전체 사용자 목록 (기존 `features/users/api.ts` 재활용 가능)
- 조직도 구조는 부서 그룹핑으로 클라이언트에서 처리

## 현재 상태

- [ ] Phase 2에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
- `features/users/api.ts`의 `useUsers()` 훅과 연계 검토
