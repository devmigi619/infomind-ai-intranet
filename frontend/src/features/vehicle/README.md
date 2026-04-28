# 차량 모듈 (Phase 2)

## 개요

사내 차량 예약 관리.

- 차량 2대 (레이, 아이오닉)
- 시간표 형식 + 예약 폼
- 차량마다 "주차 위치" 필드 포함 (메모/태그 형식)

## 디렉토리 (예정)

```
features/vehicle/
├── README.md
├── api.ts                       # 예약 API + 훅 (Phase 2에서 구현)
├── screens/
│   └── VehicleScreen.tsx        # 풀뷰 (차량 선택 + 시간표 + 예약 폼)
└── panels/
    └── VehiclePanel.tsx         # LP 퀵뷰 (차량별 오늘 예약 현황)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `VehiclePanel`

```typescript
interface VehiclePanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 차량별 (레이 / 아이오닉) 오늘 예약 현황
- 현재 주차 위치 표시
- "예약하기" 버튼

## 데이터 타입 (예정)

```typescript
interface Vehicle {
  id: number;
  name: string; // 예: "레이", "아이오닉"
  parkingLocation: string; // 주차 위치 메모 (예: "B1 3번")
}

interface VehicleReservation {
  id: number;
  vehicleId: number;
  vehicleName: string;
  reserverName: string;
  purpose: string;
  startAt: string; // ISO datetime
  endAt: string;
  destination?: string;
}
```

## API (예정)

- `GET /api/vehicles` → 차량 목록 + 현재 주차 위치
- `GET /api/vehicles/{id}/reservations?date=YYYY-MM-DD`
- `POST /api/vehicles/{id}/reservations`
- `DELETE /api/vehicles/{id}/reservations/{reservationId}`
- `PATCH /api/vehicles/{id}/parking-location` → 주차 위치 업데이트

## 현재 상태

- [ ] Phase 2에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
- 캘린더 모듈과 일정 연동 예정
