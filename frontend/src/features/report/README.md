# 주간보고 모듈

## 개요

팀원별 주간 업무 보고 작성 및 조회.

- 본인 보고 작성/수정
- 관리자는 팀 전체 보고 조회 가능

## 디렉토리

```
features/report/
├── README.md
├── api.ts                          # HTTP 함수 + React Query 훅 + 타입
├── screens/
│   └── WeeklyReportScreen.tsx      # 풀뷰
└── panels/
    └── ReportPanel.tsx             # LP 퀵뷰 ⚠️ 구현 필요
```

## 인터페이스

### LP 퀵뷰 — `ReportPanel`

```typescript
interface ReportPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 이번 주 본인 보고 상태 (작성 중 / 제출 완료)
- 관리자일 경우: 팀원 보고 제출 현황 (N/전체)
- "보고 작성" 버튼

### 풀뷰 — `WeeklyReportScreen`

```typescript
function WeeklyReportScreen(): JSX.Element; // props 없음
```

## API

- `GET /api/weekly-reports?page&size` → `{ data: { content: Report[] } }`
- `GET /api/weekly-reports/{id}` → `{ data: Report }`
- `POST /api/weekly-reports` → 보고 작성
- `PUT /api/weekly-reports/{id}` → 보고 수정

## 데이터 타입

```typescript
interface Report {
  id: number;
  weekStart: string; // ISO 날짜 (예: "2025-04-28")
  thisWeek: string; // 이번 주 업무 내용
  nextWeek: string; // 다음 주 업무 계획
  issues: string | null; // 이슈/건의사항
  createdAt: string;
}
```

## 구현된 훅

- `useReportList(page)` — 목록 조회
- `useReportDetail(id)` — 단건 조회
- `useCreateReport()` — 보고 작성
- `useUpdateReport()` — 보고 수정

## 향후 작업

- [ ] ReportPanel (LP 퀵뷰)
- [ ] 풀뷰 본인 보고 + 팀 전체 보고 탭 분리
- [ ] 관리자 전용 팀 현황 뷰
