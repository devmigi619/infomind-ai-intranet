# 개발 계획

## 진행 현황

### ✅ 셋업
- [x] 기술스택 확정 (Expo / Spring Boot / FastAPI / Ollama / Qdrant)
- [x] 아키텍처 설계 (JWT 위임 패턴, SSE 스트리밍)
- [x] 모노레포 구조
- [x] frontend / backend / ai 초기화
- [x] Git 리포지토리 초기화
- [x] Docker Compose 골격 (개발기 배포 시 정비)

### ✅ Phase 1 — Backend (Spring Boot)
- [x] JWT 발급/검증 필터 (JwtProvider, JwtFilter)
- [x] 로그인 API (`POST /api/auth/login`) + Refresh Token
- [x] Refresh Token 재발급 API (`POST /api/auth/refresh`)
- [x] 사용자 (`User` 엔티티 + 초기 테스트 계정 admin/user1)
- [x] 전체 사용자 목록 (`GET /api/users`) — 결재선 선택용
- [x] 내 정보 + FCM 토큰 업데이트 (`GET/PUT /api/users/me*`)
- [x] 게시글 CRUD + 카테고리 필터
- [x] 전자결재 상신/승인/반려/결재선 + FCM 알림
- [x] 주간보고 작성/수정/조회
- [x] H2 local 프로파일 (`application-local.yml`)
- [x] CORS 설정 (로컬 프론트-백엔드 연동용)

### ✅ Phase 1 — AI (FastAPI)
- [x] Ollama 스트리밍 연동 (`/api/chat`)
- [x] 채팅 API (`POST /ai/chat`) SSE 스트리밍
- [x] 의도 분류 (결재/게시판/주간보고/일반)
- [x] 의도별 바로가기 액션 반환

### ✅ Phase 1 — Frontend (Expo)

**기본 기능**
- [x] JWT 저장/갱신 (AsyncStorage + axios 인터셉터)
- [x] Refresh Token 인터셉터 (401 자동 재발급 + 큐 처리)
- [x] 자동 로그인 복원
- [x] 로그인 화면

**화면**
- [x] AI 채팅 메인 (SSE 스트리밍, thinking 인디케이터, 스트리밍 커서)
- [x] 게시판 목록/상세/작성
- [x] 전자결재 목록/상세/승인·반려/상신 폼
- [x] 주간보고 목록/작성

**알림**
- [x] 푸시 알림 구조 (실 테스트는 서버 연결 후)

### ✅ 인프라 정리 (UX 재설계 + 코드 구조 정비)

**UX 재설계**
- [x] 탭 시스템 제거
- [x] NavRail (홈 + 메뉴, 토글 동작)
- [x] LeftPanel (모듈 퀵 프리뷰, 슬라이드)
- [x] RightPanel (홈 / AI 두 탭, 토글 가능)
- [x] AI 응답 → RP AI 탭 빨간점 알림 (자동 전환 X, 명시 호출만)
- [x] 관리자 모드 토글 (NavRail 메뉴 완전 교체)
- [x] 우상단 아바타 메뉴 (설정 자리 + 로그아웃)
- [x] 통합검색 자리 (회색 비활성, Phase 2에서 동작)

**코드 구조**
- [x] features-based 디렉토리 (`features/auth, board, approval, report, chat, users`)
- [x] `shared/` (api/components/hooks/constants)
- [x] `layout/` (TopHeader, NavRail, LeftPanel, RightPanel 등)
- [x] `store/uiStore.ts` (Zustand 글로벌 상태)
- [x] React Query 도입 (서버 상태 캐싱/동기화)
- [x] 디자인 토큰 (`shared/constants/`: colors, spacing, radius, typography, shadows, duration, zIndex)

---

## 다음 단계

### ▶ 3단계 — LeftPanel 모듈별 퀵뷰
- [ ] 게시판 LP (최근 글, 카테고리)
- [ ] 전자결재 LP (대기/올린/완료)
- [ ] 주간보고 LP (이번 주 / 지난 주)
- [ ] 캘린더 LP (오늘 일정) — Phase 2 데이터 연동 전 placeholder
- [ ] 회의실 LP — placeholder
- [ ] 차량 LP — placeholder

### 4단계 — 모듈별 풀뷰 레이아웃 다듬기
- [ ] 게시판 풀뷰 (목록/상세/작성 레이아웃 정비)
- [ ] 전자결재 풀뷰 (결재함 구조 — 받은/올린/완료)
- [ ] 주간보고 풀뷰

### 5단계 — 부가 화면
- [ ] 우상단 아바타 드롭다운 정비
- [ ] 사용자 설정 화면 (프로필/비밀번호/알림 카테고리별)
- [ ] 로그인 화면 다듬기

### 디자인 토큰 점진적 적용
- [ ] 기존 컴포넌트의 하드코딩된 색상/간격을 토큰으로 마이그레이션 (점진적, 손대는 컴포넌트만)

---

## Phase 1 완료 기준

> 로그인 → AI 채팅 → 결재 상신 → **알림 수신**까지 실제 동작

- ✅ 로그인 (로컬 H2 + JWT)
- ✅ AI 채팅 (Ollama 연동 시)
- ✅ 결재 상신 (UI + 백엔드)
- 🔶 알림 수신 — 구조 완성. 실 테스트는 FCM 키 발급 + 서버 배포 후

---

## Phase 2

- [ ] 캘린더 / 일정관리
- [ ] 회의실 예약
- [ ] 차량 예약
- [ ] 통합검색 (TopHeader 검색바 동작 — 키워드 풀텍스트, PostgreSQL 풀텍스트 또는 ElasticSearch)
- [ ] 모바일 레이아웃 (풀스크린 오버레이)
- [ ] 다크 모드 (디자인 토큰 시맨틱 구조 활용)

## Phase 3

- [ ] 증명서 출력
- [ ] 권한 관리 + 관리자 화면 (현재 NavRail 관리자 모드 자리만 마련됨)
- [ ] RAG (내규 문서 검색, AI 채팅에서 활용)
- [ ] 다국어 (한국어 / 영어)

---

## 운영 관련 (별도 트랙)

- [ ] GPU 개발기 PostgreSQL + Ollama + Qdrant 셋업
- [ ] Docker Compose 정비 (개발기/운영기 분리)
- [ ] CI/CD 파이프라인
- [ ] 운영기 배포 (Nginx, SSL, FCM 키)
