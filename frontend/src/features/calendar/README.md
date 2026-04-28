# 캘린더 모듈 (Phase 2)

## 개요

휴가/업무/회의실/차량 일정을 통합 표시하는 캘린더 허브.

- 카테고리별 태그 필터 (사용자가 보임/숨김 토글)
- 각 예약 모듈(회의실, 차량)과 연계

## 디렉토리 (예정)

```
features/calendar/
├── README.md
├── api.ts                        # 일정 조회 API + 훅 (Phase 2에서 구현)
├── screens/
│   └── CalendarScreen.tsx        # 풀뷰 (월/주/일 뷰)
└── panels/
    └── CalendarPanel.tsx         # LP 퀵뷰 (오늘 일정 리스트)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `CalendarPanel`

```typescript
interface CalendarPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 오늘 일정 리스트 (시간 + 제목 + 카테고리 색상)
- "일정 추가" 버튼

### 풀뷰 — `CalendarScreen`

- 월/주/일 뷰 전환
- 카테고리 필터 칩 (전체 / 업무 / 휴가 / 회의실 / 차량)

## 데이터 타입 (예정)

```typescript
type EventCategory = 'WORK' | 'VACATION' | 'MEETING_ROOM' | 'VEHICLE';

interface CalendarEvent {
  id: number;
  title: string;
  category: EventCategory;
  startAt: string; // ISO datetime
  endAt: string;
  createdBy: string;
}
```

## 현재 상태

- [ ] Phase 2에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
