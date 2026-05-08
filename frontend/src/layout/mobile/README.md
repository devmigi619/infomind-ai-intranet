# 모바일 화면 위계 정책

이 문서는 모바일 레이아웃에서 화면/오버레이/모달이 어떤 레벨에 속하는지,
어떤 시각·동작 정책을 따라야 하는지를 정의합니다.

> **PC와는 분리된 정책입니다.** PC 쪽(NavRailMorePopover, 데스크톱 모달 등)은 본 문서 범위가 아닙니다.

## 위계 3단계

| 레벨 | 종류 | 예시 컴포넌트 | NavRail/헤더 보임 | NavRail/헤더 클릭 | backdrop | 닫기 |
|---|---|---|---|---|---|---|
| **1. 풀뷰** | 페이지 전환급 화면 | `MobileFullScreenRouter` (게시판/결재/보고/공통코드/설정/**메뉴 패널**) | 보임 | 다른 탭 눌러 전환 | 없음 | NavRail 탭 또는 홈 |
| **2. 로컬 시트** | (참고) 한때 시트 형태가 있었으나 풀뷰/모달로 정리되어 더 이상 사용 안 함 | — (`MobileMoreModal`은 풀뷰로 승격, `NavRailCustomizationModal`은 모달로 통일) | — | — | — | — |
| **3. 모달** | 본격 작업 다이얼로그 | `NavRailCustomizationModal` (맞춤설정), 추후 비밀번호 변경 등 | 어둡게 가려짐 | 완전 차단 | 풀스크린 (`rgba(0,0,0,0.4)`) | X 버튼, backdrop 탭 |

> **모바일 시트 카테고리는 폐기되었습니다.** `MobileMoreModal` 풀뷰화 + `NavRailCustomizationModal` 모달화로 더 이상 시트를 사용하지 않습니다. 풀뷰끼리는 자연스러운 갈아타기 룰을 따르므로, 더보기는 풀뷰(메뉴 패널)로 승격되었고, 설정 모달은 디바이스 무관 화면 중앙 fade 모달로 통일되었습니다.

## zIndex 컨벤션

레벨 간 우위가 일관되게 보장되도록 다음 값을 사용합니다.

| 컴포넌트 종류 | zIndex |
|---|---|
| 풀뷰 (`MobileFullScreenRouter`, `MobileMenuPanel` 포함) — body 내부에 갇힘 | 1 |
| 레벨 2 시트 (폐기됨, 사용 금지) | — |
| NavRail (`MobileBottomTabBar.container`) | **100** |
| 레벨 3 모달 (`NavRailCustomizationModal` 등) | RN Modal 사용 시 zIndex 명시 불필요 |

핵심 의도:
- **레벨 3 모달은 RN Modal로 구현** — RN Modal은 자체 stacking 컨텍스트를 가지므로 zIndex 명시가 필요 없음. 자동으로 NavRail/헤더 위에 표시되고 backdrop이 클릭을 차단.

## 새 오버레이/모달 추가 시 판단 가이드

새로운 오버레이 컴포넌트를 만들 때 다음 질문에 답해서 레벨을 결정하세요.

1. **이 오버레이는 NavRail이나 헤더의 한 버튼에서 즉시 열리는, 가벼운 메뉴/드롭다운인가?**
   - 모바일에서는 시트를 사용하지 않습니다. **풀뷰**로 승격하세요. 풀뷰끼리는 갈아타기가 자연스럽고, 시트 외부의 어둠/클릭 가능성 충돌이 없음.

2. **이 오버레이는 사용자가 본격적으로 입력하거나 결정하는 다이얼로그인가? (예: 설정, 폼, 확인 다이얼로그)**
   - 그렇다면 → **레벨 3 (모달)**.
   - **디바이스 무관** — 화면 중앙 fade 모달, 풀스크린 어두운 backdrop(`rgba(0,0,0,0.4)`).
   - RN `Modal animationType="fade"` 사용. zIndex는 명시 불필요(RN Modal 자체 stacking).
   - 모바일은 박스 폭 `'90%'`, PC는 `480px` 정도로 분기.
   - NavRail/헤더 클릭은 backdrop이 위에 있어 자동 차단됨.
   - 닫기는 X 버튼 또는 backdrop 탭으로만 가능.

3. **이 오버레이는 페이지 자체를 갈아끼우는 화면인가?**
   - 그렇다면 → **레벨 1 (풀뷰)**.
   - `MobileFullScreenRouter`에 라우트를 추가하고, 헤더/탭바를 그대로 두는 형태로 구현.

## 시각·모션 일관성

- 풀뷰 슬라이드 시간: 열림 280ms / 닫힘 240ms
- 모달은 RN `Modal animationType="fade"`로 표시 (별도 시간 명시 불필요)
- 모달 박스는 `borderRadius: 16`
- backdrop 색은 위 정책 그대로 사용. 다른 색·투명도 도입 금지.
- 색은 `theme.brand.primary`, `theme.brand.primaryTint` 등 디자인 토큰 사용. 색 하드코딩은 backdrop 값(`rgba(0,0,0,0.4)`)에 한정.

## 현재 컴포넌트 매핑

| 컴포넌트 | 위치 | 레벨 |
|---|---|---|
| `MobileTopHeader` | `frontend/src/layout/mobile/MobileTopHeader.tsx` | (헤더 자체 — 레벨 1 위에 항상 표시) |
| `MobileBottomTabBar` | `frontend/src/layout/mobile/MobileBottomTabBar.tsx` | (NavRail 자체 — 레벨 1 위에 항상 표시) |
| `MobileFullScreenRouter` | `frontend/src/layout/mobile/MobileFullScreenRouter.tsx` | 1 (풀뷰) |
| `MobileMenuPanel` (`'menu-panel'` 풀뷰) | `frontend/src/layout/mobile/MobileMenuPanel.tsx` | 1 (풀뷰) |
| `NavRailCustomizationModal` | `frontend/src/layout/NavRailCustomizationModal.tsx` | 3 (모달, 디바이스 무관 화면 중앙 fade 모달) |

## 메뉴 패널 (`MobileMenuPanel`) 동작

- 더보기 버튼을 누르면 `activeFullScreen='menu-panel'` 풀뷰로 진입합니다.
- 진입 시 `previousFullScreen`에 직전 풀뷰 위치를 저장하여, 메뉴 리스트에서 직전 위치 항목을 active 시각(브랜드 톤 배경 + 강조 색)으로 표시합니다 — "직전에 보던 위치"임을 알려주는 시각.
- 메뉴 항목 클릭 → 그 풀뷰로 전환(`previousFullScreen`은 리셋).
- 더보기 버튼 active 조건: `activeFullScreen === 'menu-panel'` 또는 핀 안 된 메뉴(공통코드 등) 풀뷰에 있을 때 — 사용자가 자기가 "더보기 영역"에 있음을 인지하도록.
- 더보기를 다시 누르면(메뉴 패널에 있을 때) 홈으로 복귀.

## 관리자 모드 진입

- 관리자 모드 진입: PC는 `TopHeader`, 모바일은 `MobileTopHeader`의 토글 버튼.
- 모바일 토글 버튼은 헤더 우측 컨트롤 그룹 첫 번째 자리(알림 버튼 왼쪽)에 위치하며, `Shield` 아이콘 + 알림 버튼과 동일한 `iconButton` 스타일을 사용한다. 활성 시 `theme.brand.primaryTint` 배경 + `theme.brand.primary` 색.
- 토글 버튼은 PC와 동일하게 `userId === 'admin'` 계정에만 노출된다.
- '홈'은 모드 무관 동일 화면 (`MainScreen`). `'admin-home'` 별도 panelId는 폐기되었다 — 관리자 모드 NavRail 첫 자리도 일반 모드와 같은 '홈'이며, 클릭 시 `goHome()` → `MainScreen`.
