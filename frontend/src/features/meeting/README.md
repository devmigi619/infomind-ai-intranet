# 회의실 모듈 (Phase 2)

## 개요

사내 회의실 예약 관리.

- 회의실 1개 (2층)
- 시간표 형식으로 예약 현황 표시
- 예약 폼

## 디렉토리 (예정)

```
features/meeting/
├── README.md
├── api.ts                        # 예약 API + 훅 (Phase 2에서 구현)
├── screens/
│   └── MeetingScreen.tsx         # 풀뷰 (시간표 + 예약 폼)
└── panels/
    └── MeetingPanel.tsx          # LP 퀵뷰 (오늘 예약 현황)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `MeetingPanel`

```typescript
interface MeetingPanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 오늘 회의실 예약 현황 (타임슬롯 바 또는 리스트)
- "예약하기" 버튼

## 데이터 타입 (예정)

```typescript
interface MeetingReservation {
  id: number;
  title: string;
  reserverName: string;
  startAt: string; // ISO datetime
  endAt: string;
  attendees?: string;
}
```

## API (예정)

- `GET /api/meeting-rooms/{roomId}/reservations?date=YYYY-MM-DD`
- `POST /api/meeting-rooms/{roomId}/reservations`
- `DELETE /api/meeting-rooms/{roomId}/reservations/{id}`

## 현재 상태

- [ ] Phase 2에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
- 캘린더 모듈과 일정 연동 예정
