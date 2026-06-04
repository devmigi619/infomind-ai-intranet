# 보고 모듈

## 개요

일간/주간/월간 보고 양식과 회차를 기준으로 사용자가 보고를 작성하고, 같은 부서의 회차별 제출 현황과 제출 내용을 확인한다.

- 보고 양식/회차는 관리자 화면에서 생성한다.
- 사용자는 본인 부서에 배정된 활성 양식과 회차만 조회한다.
- 제출 전에는 임시저장 상태로 수정 가능하다.
- 제출 완료 후에는 사용자가 다시 수정할 수 없다.
- 같은 회차의 제출 완료 보고는 같은 부서 사용자에게 공개된다.

## 디렉토리

```text
features/report/
├── README.md
├── api.ts                          # 사용자 보고 API 함수 + React Query 훅 + 타입
├── components/
│   └── ReportQuickPanel.tsx        # LeftPanel 퀵뷰
└── screens/
    └── ReportScreen.tsx            # 풀뷰
```

관리자 화면은 별도 feature에 둔다.

```text
features/admin-report/
├── api.ts                          # 관리자 보고 API 함수 + React Query 훅 + 타입
└── screens/
    └── AdminReportScreen.tsx       # 관리자 보고 관리 화면
```

## 사용자 흐름

```text
LeftPanel 보고 아이콘
→ ReportQuickPanel
→ 열기
→ ReportScreen
   ├─ 보고 홈: 현재 시점에 걸린 보고 카드 + 보고 양식 목록
   ├─ 보고서 상세: 양식별 회차 목록
   └─ 회차 상세: 제출 현황 + 미보고자/보고자 카드
```

회차 상세 정책:

- 제출 현황은 `제출 n명 / 대상 n명`으로 표시한다.
- `NOT_WRITTEN`, `DRAFT`는 미보고자로 표시한다.
- `SUBMITTED`는 보고자로 표시한다.
- 미보고자 중 본인 카드는 클릭 시 작성 모달을 연다.
- 미보고자 중 타인 카드는 클릭해도 열리지 않는다.
- 보고자 카드는 본인/타인 모두 내용 보기 모달을 연다.

## 사용자 API

| 경로 | 설명 |
|---|---|
| `GET /api/reports/my-rounds` | 본인 부서에 배정된 활성 양식/회차와 본인 작성 상태 조회 |
| `GET /api/reports/{formId}/rounds/{roundSn}` | 특정 회차의 본인 보고 상태 조회 |
| `GET /api/reports/{formId}/rounds/{roundSn}/submissions` | 특정 회차의 대상자별 제출 상태/내용 조회 |
| `PUT /api/reports/{formId}/rounds/{roundSn}/draft` | 본인 보고 임시저장 |
| `POST /api/reports/{formId}/rounds/{roundSn}/submit` | 본인 보고 제출 |

## 사용자 데이터 타입

```typescript
type ReportStatus = 'NOT_WRITTEN' | 'DRAFT' | 'SUBMITTED';

interface MyReportRound {
  rptFormId: string;
  rptTtl: string;
  rptDesc: string;
  rptDtSe: string;
  roundSn: number;
  roundNm: string;
  roundYmd: string;
  status: ReportStatus;
  execDesc: string | null;
  planDesc: string | null;
  sbmtYmd: string | null;
  targetCount: number;
  submittedCount: number;
}

interface ReportSubmission {
  userId: string;
  userNm: string;
  status: ReportStatus;
  sbmtYmd: string | null;
  execDesc: string | null;
  planDesc: string | null;
}

interface ReportWriteRequest {
  execDesc: string;
  planDesc: string;
}
```

## 사용자 훅

- `useMyReportRounds()` — 본인 접근 가능 회차 목록
- `useMyReportRound(formId, roundSn)` — 특정 회차의 본인 상태
- `useReportSubmissions(formId, roundSn)` — 특정 회차의 대상자별 제출 상태
- `useSaveReportDraft()` — 임시저장
- `useSubmitReport()` — 제출

## 관리자 화면

관리자 메뉴 ID는 `rpt-form`이며, 화면은 3개 탭으로 구성된다.

```text
양식관리
→ 양식 목록
→ 양식 추가/수정
→ 활성/비활성 전환

회차관리
→ 양식 선택
→ 회차 목록
→ 회차 생성/수정/삭제

보고관리
→ 양식/회차 선택
→ 제출 현황 카드
→ AI 요약 생성/재생성
→ 요약 직접 수정
```

관리자 API:

| 경로 | 설명 |
|---|---|
| `GET /api/admin/report-forms` | 보고 양식 목록 |
| `POST /api/admin/report-forms` | 보고 양식 생성 |
| `PUT /api/admin/report-forms/{formId}` | 보고 양식 수정 |
| `PATCH /api/admin/report-forms/{formId}/enable` | 보고 양식 활성화 |
| `PATCH /api/admin/report-forms/{formId}/disable` | 보고 양식 비활성화 |
| `GET /api/admin/report-forms/{formId}/rounds` | 양식별 회차 목록 |
| `POST /api/admin/report-forms/{formId}/rounds` | 회차 생성 |
| `PUT /api/admin/report-forms/{formId}/rounds/{roundSn}` | 회차 수정 |
| `DELETE /api/admin/report-forms/{formId}/rounds/{roundSn}` | 회차 삭제 |
| `GET /api/admin/report-forms/{formId}/rounds/{roundSn}/submissions` | 회차별 제출 현황 |
| `POST /api/admin/report-forms/{formId}/rounds/{roundSn}/summary` | AI 요약 생성 |
| `PUT /api/admin/report-forms/{formId}/rounds/{roundSn}/summary` | 요약 직접 수정 |

## 관리자 정책

- 회차 순번은 양식별 `MAX(round_sn) + 1`로 부여한다.
- 동일 양식에 동일 기준일 회차를 중복 생성하지 않는다.
- `int_rpt_desc`가 하나라도 있으면 해당 회차 수정/삭제를 막는다.
- 회차가 하나라도 있으면 양식의 `rpt_dt_se`, `dept_cd`, `st_ymd` 수정은 막는다.
- 양식은 삭제하지 않고 `use_yn`으로 활성 상태만 전환한다.
- 제출 상태는 `NOT_WRITTEN`, `DRAFT`, `SUBMITTED`로 계산한다.
- AI 요약은 제출 완료 보고만 대상으로 생성한다.
- AI 호출 실패 시 기존 요약은 유지한다.

## DB 기준

| 테이블 | 설명 |
|---|---|
| `int_rpt_form` | 보고 양식 |
| `int_rpt_round` | 양식별 회차 |
| `int_rpt_desc` | 회차별 사용자 작성 내용 |

보고 주기 선택값은 공통코드 `RPT_DT_SE`에서 조회한다.
