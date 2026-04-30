# notifications

인앱 알림 표시 모듈 — TopHeader 벨 아이콘을 통해 접근하는 드롭다운 알림 시스템.

## 모듈 책임

- 알림 목록 조회 및 읽음/미읽음 상태 관리
- 벨 아이콘 + PulseDot(미읽음 시만 표시) 연동
- 드롭다운 UI: 카드 클릭 시 즉시 읽음 처리, 일괄 읽음, 전체 목록 이동(Phase 2)

## 디렉토리 구조

```
features/notifications/
├── api.ts                          # 타입 + 목 데이터 + React Query 훅
└── components/
    ├── NotificationCard.tsx        # 개별 알림 카드 (읽음/미읽음 상태 시각화)
    └── NotificationDropdown.tsx    # 드롭다운 컨테이너 (Modal 기반)
```

## 외부 의존성

- 현재: 없음 (목 데이터)
- 추후: Spring Boot `/api/notifications` 엔드포인트 — `api.ts`의 `queryFn`만 교체

## TopHeader 통합 예시

```tsx
import { NotificationDropdown } from '../features/notifications/components/NotificationDropdown';
import { useUnreadNotificationCount } from '../features/notifications/api';

function TopHeader() {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  return (
    <>
      <TouchableOpacity onPress={() => setNotifOpen((v) => !v)}>
        <Bell size={18} />
        {unreadCount > 0 && <PulseDot ringColor="#ffffff" top={6} right={6} />}
      </TouchableOpacity>
      <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
```

## 로드맵

- **Phase 1 (현재)**: 목 데이터 기반 UI 골격, 드롭다운 인터랙션
- **Phase 2**: 백엔드 API 연결, 알림 센터 전체 화면
- **Phase 3**: 푸시 알림(Expo Notifications) 연동
