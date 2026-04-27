# 개발 계획

## 완료 (Phase 1 진입 전)

- [x] 기술스택 확정
- [x] 아키텍처 설계 (JWT 위임 패턴)
- [x] 모노레포 구조 생성
- [x] Docker Compose 구성
- [x] Nginx 설정 (SSE 스트리밍 포함)
- [x] 문서화 (ARCHITECTURE, ADR, SETUP, CONVENTIONS)
- [x] frontend 초기화 (Expo + 웹 지원)
- [x] backend 초기화 (Spring Boot 3.5 + JWT + FCM 의존성)
- [x] ai 초기화 (FastAPI + Ollama + Qdrant 연동 골격)
- [x] `.env.dev` 생성
- [x] Git 리포지토리 초기화 및 GitHub 푸시

## 완료 (Phase 1 진행 중)

- [x] Frontend 레이아웃 골격 — TopHeader, NavRail, TabBar, MobileNavBar (Noto Sans KR, 더미)

### Backend (Spring Boot) ✅
- [x] JWT 발급/검증 필터 (JwtProvider, JwtFilter)
- [x] 로그인 API (`POST /api/auth/login`) + Refresh Token
- [x] Refresh Token 재발급 API (`POST /api/auth/refresh`)
- [x] `User` 엔티티 + Repository + 초기 테스트 계정 (admin/user1)
- [x] 전체 사용자 목록 조회 (`GET /api/users`) — 결재선 선택용
- [x] 내 정보 조회 (`GET /api/users/me`) + FCM 토큰 업데이트
- [x] 게시글 CRUD + 카테고리 필터
- [x] 전자결재 상신/승인/반려/결재선 + FCM 알림 연동
- [x] 주간보고 작성/수정/조회
- [x] H2 local 프로파일 (`application-local.yml`)

### Frontend (Expo) ✅
- [x] JWT 저장/갱신 (AsyncStorage + axios 인터셉터)
- [x] Refresh Token 인터셉터 (401 자동 재발급 + 큐 처리)
- [x] useAuth 훅 (자동 로그인 복원)
- [x] 로그인 화면
- [x] AI 채팅 메인 화면 (SSE 스트리밍)
- [x] 게시판 목록/상세/작성
- [x] 전자결재 목록/상세/승인·반려/상신 폼
- [x] 주간보고 목록/작성
- [x] 푸시 알림 구조 (usePushNotifications — 실 테스트는 서버 연결 후)

### AI (FastAPI) ✅
- [x] Ollama 스트리밍 연동 (`/api/chat` 방식)
- [x] 채팅 API (`POST /ai/chat`) SSE 스트리밍
- [x] 의도 분류 (결재/게시판/주간보고/일반)
- [x] 의도별 바로가기 액션 반환

---

## 개발 일정

**전제**: 개발 2~3명 (부장 1 + 사원 2), 주 5일 병렬 트랙 기준

| 주차 | Backend | Frontend | AI |
|------|---------|----------|----|
| **1주** | JWT 인증 + 로그인 API + User 엔티티 | Expo 레이아웃 골격 (TopHeader·NavRail·TabBar) | Ollama 스트리밍 연동 + 채팅 API 기본 |
| **2주** | 게시판 CRUD + 파일 업로드 | 로그인 화면 + AI 채팅 화면 (실제 API 연동) | 의도 분류 + 바로가기 액션 반환 |
| **3주** | 전자결재 (상신·승인·반려·결재선) | 게시판 화면 + 전자결재 화면 | 결재/게시판 컨텍스트 응답 |
| **4주** | 주간보고 + FCM 알림 연동 | 주간보고 화면 + 푸시 알림 수신 | 통합 테스트 + 버그 수정 |
| **5~7주** | Phase 2: 캘린더 / 회의실 / 차량 예약 | | |
| **8~10주** | Phase 3: 증명서 / 권한관리 / 관리자 / RAG | | |

**Phase 1 완료 기준**: 로그인 → AI 채팅 → 결재 상신 → 알림 수신까지 실제 동작

---

## Phase 1 — 핵심 기능 + AI 허브

### Backend (Spring Boot)

**인증**
- [ ] JWT 발급/검증 필터
- [ ] 로그인 API (`POST /api/auth/login`)
- [ ] Refresh Token

**사용자**
- [ ] `User` 엔티티 + Repository
- [ ] 내 정보 조회 (`GET /api/users/me`)

**게시판**
- [ ] 게시글 CRUD
- [ ] 파일 첨부 업로드

**전자결재**
- [ ] 결재 상신 (`POST /api/approvals`)
- [ ] 결재 승인/반려 (`POST /api/approvals/{id}/approve`, `/reject`)
- [ ] 결재선 설정
- [ ] FCM 알림 연동

**주간보고**
- [ ] 주간보고 작성/조회

### Frontend (Expo)

**공통**
- [ ] React Navigation 설정 (웹 + 모바일)
- [ ] JWT 저장/갱신 (expo-secure-store + axios 인터셉터)
- [ ] 공통 레이아웃 컴포넌트 (NavRail, TabBar, 패널)

**화면**
- [ ] 로그인 화면
- [ ] AI 채팅 메인 화면
- [ ] 게시판 목록/상세/작성
- [ ] 전자결재 목록/상세/상신 폼
- [ ] 주간보고 작성/조회
- [ ] 푸시 알림 수신 (expo-notifications)

### AI (FastAPI)

- [ ] Ollama 스트리밍 연동 확인
- [ ] 채팅 API (`POST /ai/chat`) SSE 스트리밍
- [ ] 의도 분류 (결재 / 게시판 / 주간보고 / 일반)
- [ ] 의도별 응답 + 바로가기 액션 반환

---

## Phase 2

- [ ] 캘린더 및 일정관리
- [ ] 회의실 예약
- [ ] 차량 예약

## Phase 3

- [ ] 증명서 출력
- [ ] 권한관리
- [ ] 관리자 화면
- [ ] RAG (내규 문서 검색)
