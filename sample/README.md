# Infomind AI Intranet

AI-first 기업 인트라넷 대시보드 프로토타입. 중앙 채팅 인터페이스를 허브로 하여 업무를 시작하고, 전통적인 메뉴(게시판, 전자결재, 캘린더 등)를 탭과 사이드 패널로 함께 제공합니다.

---

## 프로젝트 개요

Infomind는 기존의 대메뉴 중심 인트라넷을 AI 챗봇 중심으로 재구성한 프로토타입입니다.

- **챗봇 메인**: 자연어로 업무를 시작 ("이번 주 주간보고 현황 알려줘")
- **사이드 패널**: 빠른 미리보기 (NavRail 클릭 시 슬라이드)
- **탭 기반 메뉴**: 전통적인 게시판, 전자결재, 캘린더 등을 전체 화면으로
- **대화결과 탭**: AI가 찾은 문서 요약, 관련 업무 바로가기
- **통합 검색**: 이름, 업무, 제목 등 모든 데이터에서 검색

### 지원 기능

| 기능 | 설명 |
|------|------|
| 게시판 | 공지사항, 경조사, 자유게시판 목록/상세/검색 |
| 전자결재 | 대기/진행/완료/반려 상태별 조회, 승인/반려 |
| 주간보고 | 부서별 제출 현황, 통계 |
| 증명서 출력 | 재직증명서, 경력증명서 등 발급 신청 |
| 차량예약관리 | 차량 상태 시각화, 예약 현황 |
| 회의실예약 | 회의실 클릭 시 시설/예약 상세 |
| 캘린더 | 월간 뷰 + 일정 목록 |

### 기술 스택

- React 19 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion (애니메이션)
- Lucide React (아이콘)
- Day.js (날짜)

---

## 로컬에서 실행하기

### 요구사항

- Node.js 20+
- npm

### 설치

```bash
# 저장소 클론 후 프로젝트 디렉토리로 이동
cd infomind-ai-intranet

# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

기본적으로 http://localhost:5173 에서 접속할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

### 빌드 결과물 미리보기

```bash
npm run preview
```

---

## 프로젝트 구조

```
├── public/              # 정적 파일
├── src/
│   ├── components/      # 공통 컴포넌트
│   │   ├── ChatArea.tsx         # 채팅 영역 (메시지 + 입력)
│   │   ├── ChatInputBar.tsx     # 채팅 입력창
│   │   ├── LeftPanel.tsx        # 좌측 사이드 패널
│   │   ├── MainContentArea.tsx  # 탭별 메인 콘텐츠
│   │   ├── MessageBubble.tsx    # 메시지 버블
│   │   ├── MobileNavBar.tsx     # 모바일 하단 네비게이션
│   │   ├── NavRail.tsx          # 좌측 아이콘 네비게이션
│   │   ├── PanelHeader.tsx      # 패널 헤더
│   │   ├── RightTabPanel.tsx    # 우측 탭 패널
│   │   ├── TabBar.tsx           # 상단 탭 바
│   │   ├── TopHeader.tsx        # 상단 헤더
│   │   ├── WelcomeScreen.tsx    # 채팅 웰컴 화면
│   │   └── WidgetCard.tsx       # 위젯 카드
│   ├── data/            # 데모 데이터
│   │   └── demo-data.ts
│   ├── hooks/           # 커스텀 훅
│   │   ├── useChat.ts
│   │   └── usePanel.ts
│   ├── pages/           # 탭별 메인 화면
│   │   ├── ApprovalMainPage.tsx
│   │   ├── BoardMainPage.tsx
│   │   ├── CalendarMainPage.tsx
│   │   ├── CertificateMainPage.tsx
│   │   ├── MeetingRoomMainPage.tsx
│   │   ├── SearchResultPage.tsx
│   │   ├── VehicleMainPage.tsx
│   │   └── WeeklyReportMainPage.tsx
│   ├── panels/          # 사이드 패널 콘텐츠
│   │   ├── ApprovalPanel.tsx
│   │   ├── BoardPanel.tsx
│   │   ├── CalendarPanel.tsx
│   │   ├── CertificatePanel.tsx
│   │   ├── MeetingRoomPanel.tsx
│   │   ├── VehiclePanel.tsx
│   │   └── WeeklyReportPanel.tsx
│   ├── types/           # TypeScript 타입
│   │   └── index.ts
│   ├── App.tsx          # 메인 앱 컴포넌트
│   ├── App.css          # 전역 스타일
│   ├── main.tsx         # 엔트리 포인트
│   └── index.css        # Tailwind + 폰트
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 라이선스

프로토타입 목적으로 제작되었습니다.
