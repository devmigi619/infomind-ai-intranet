# 전자결재 모듈

## 개요

휴가/지출/일반 결재 신청 및 승인/반려.

- 휴가 신청 = 결재의 한 종류 (별도 모듈 X)
- 잔여 연차는 RP 홈 탭의 "내 연차" 카드로 별도 노출 (사용자 정보)

## 디렉토리

```
features/approval/
├── README.md
├── api.ts                       # 결재 API + 훅
├── screens/
│   └── ApprovalScreen.tsx       # 풀뷰
└── panels/
    └── ApprovalPanel.tsx        # LP 퀵뷰 ⚠️ 구현 필요
```

## 인터페이스

### LP 퀵뷰 — `ApprovalPanel`

```typescript
interface ApprovalPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 섹션: 대기 중 (내가 처리할 것) — 강조
- 섹션: 내가 올린 결재 (진행 중)
- 섹션: 최근 처리 완료
- "새 결재 상신" 버튼

### 풀뷰 — `ApprovalScreen`

```typescript
function ApprovalScreen(): JSX.Element; // props 없음
```

## API

- `GET /api/approvals?type=my|pending` → `{ data: { content: ApprovalSummary[] } }`
- `GET /api/approvals/{id}` → `{ data: ApprovalDetail }`
- `POST /api/approvals` → 결재 상신
- `POST /api/approvals/{id}/approve` → 승인
- `POST /api/approvals/{id}/reject` → 반려

## 데이터 타입

```typescript
type ApprovalType = 'VACATION' | 'EXPENSE' | 'GENERAL';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApprovalSummary {
  id: number;
  title: string;
  type: ApprovalType;
  status: ApprovalStatus;
  requesterName: string;
  createdAt: string;
}

interface ApprovalLine {
  seq: number;
  approverName: string;
  status: ApprovalStatus;
  comment?: string;
  decidedAt?: string;
}

interface ApprovalDetail extends ApprovalSummary {
  content: string;
  approvalLines: ApprovalLine[];
}
```

## 구현된 훅

- `useApprovalList(type)` — 목록 조회 (`'my' | 'pending'`)
- `useApprovalDetail(id)` — 단건 조회
- `useCreateApproval()` — 결재 상신
- `useApproveApproval()` — 승인
- `useRejectApproval()` — 반려

## 향후 작업

- [ ] ApprovalPanel (LP 퀵뷰)
- [ ] 풀뷰 결재함 구조 정비 (받은/올린/완료 탭)
- [ ] 잔여 연차 카드 (RP 홈 탭) — 별도 모듈?
