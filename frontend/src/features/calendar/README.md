# 캘린더 모듈

## 컴포넌트

| 파일 | 설명 |
|---|---|
| `screens/CalendarScreen.tsx` | 풀뷰 컨테이너 — 뷰 토글(월/주/일/목록) + 부서 필터 + 본문 |
| `components/MonthView.tsx` | 월뷰 |
| `components/WeekView.tsx` | 주뷰 (모바일은 WeekListView로 위임) |
| `components/WeekListView.tsx` | 모바일 주뷰 — 리스트 형태 |
| `components/DayView.tsx` | 일뷰 (데스크탑 전용) |
| `components/ListView.tsx` | 목록뷰 (데스크탑 전용) |
| `components/CalendarQuickPanel.tsx` | LP 퀵뷰 — 미니 달력 + 선택 날짜 일정 |
| `components/ScheduleCreateModal.tsx` | 등록/수정 모달 |
| `components/ScheduleDetailModal.tsx` | 상세 모달 + 참석/불참 응답 |
| `components/_dayTimeline.ts` | 주뷰/일뷰 공유 헬퍼 — 시간 그리드 상수, lane 분할 |

## API 훅 (`api.ts`)

| 훅 | 설명 |
|---|---|
| `useScheduleRange` | 기간 조회 |
| `useScheduleDetail` | 단건 조회 |
| `useCreateSchedule` | 등록 |
| `useUpdateSchedule` | 시리즈 전체 수정 |
| `useDeleteSchedule` | 시리즈 전체 삭제 |
| `useUpdateOccurrence` | 반복 단일 인스턴스 수정 |
| `useUpdateFromOccurrence` | 그 발생일 이후 시리즈 교체 |
| `useDeleteOccurrence` | 반복 단일 인스턴스 삭제 |
| `useMarkViewed` | 조회 마킹 (참석자별 user_qry_yn) |
| `useRespondAttendance` | 참석/불참 응답 |

## 정책

- **반복 일정**: 시리즈 row 1개로 저장 + `int_schd_excp`로 예외(skip·종료) 처리. 인스턴스 펼치기는 서버가 조회 시점에 처리
- **부서(`dept_cd`)**: 권한 분류 + 필터 라벨 양쪽에 사용. `null`이면 전사 공개. 일반 사용자는 1명 = 부서 1개 원칙
- **조회 범위**: 자기 부서 + 전사(`null`) 일정. 참석자에 포함되면 부서 권한 무시. 서버 강제는 미구현 (클라이언트 `dept` 파라미터로 제어)
- **모바일**: 월/주 뷰만 노출. 일/목록은 데스크탑 전용
- **카테고리**: "업무"만 활성. "휴가"는 전자결재 연동 후 활성화 예정
