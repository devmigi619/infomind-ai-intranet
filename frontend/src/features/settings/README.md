# 설정 모듈

## 모듈 책임

사용자별 앱 설정 화면 제공. 계정 정보 확인/편집, 알림 설정, NavRail 맞춤설정, 화면 설정을 포함한다.
현재 골격(Track 1) 구현 — 백엔드 API 연결은 Track 2에서 수행.

## 디렉토리 구조

```
features/settings/
├── README.md
├── screens/
│   └── SettingsScreen.tsx      # 메인 설정 화면 (사이드바 + 콘텐츠 영역)
└── sections/
    ├── AccountSection.tsx       # 계정 — 프로필 사진, 이름/부서/직급(read-only), 이메일/연락처(편집), 비밀번호 변경
    ├── NotificationSection.tsx  # 알림 — 푸시 알림 마스터 토글 + 카테고리별 토글
    ├── CustomizeSection.tsx     # 맞춤설정 — NavRail 메뉴 편집 버튼, RP 위젯(준비 중), 자주 쓰는 결재선(준비 중)
    └── DisplaySection.tsx       # 화면 — 다크 모드(준비 중), 언어(disabled)
```

## uiStore 의존성

| 상태/액션 | 용도 |
|---|---|
| `activeFullScreen === 'settings'` | 설정 화면 진입 조건 |
| `settingsCategory` | 현재 선택된 카테고리 (`'account' \| 'notification' \| 'customize' \| 'display'`) |
| `setSettingsCategory(category)` | 카테고리 전환 |
| `openSettingsScreen()` | 설정 화면 진입 — `activePanel: null`, `activeFullScreen: 'settings'` 로 세팅 |

## 진입 경로

```
AvatarMenu "설정" 클릭
  → onSettingsClick() (TopHeader → App.tsx)
  → openSettingsScreen() (uiStore)
  → activeFullScreen = 'settings'
  → App.tsx renderMain() case 'settings' → <SettingsScreen />
```

## 외부 컴포넌트 의존

- `NavRailCustomizationModal` (`layout/NavRailCustomizationModal.tsx`) — CustomizeSection에서 직접 import하여 로컬 `useState`로 모달 열림/닫힘 관리

## 백엔드 의존성

현재 없음. 모든 상태는 로컬 `useState`로 관리.

Track 2에서 연결 예정:
- `GET /api/users/me` — 계정 정보 조회
- `PATCH /api/users/me` — 이메일/연락처 저장
- `POST /api/auth/change-password` — 비밀번호 변경
- `GET/PUT /api/users/me/notification-settings` — 알림 설정 저장
