# 개발 계획

## 현재 상태 (2026-04-24)

### 완료
- [x] 기술스택 확정
- [x] 아키텍처 설계 (C안: JWT 위임 패턴)
- [x] 모노레포 구조 생성
- [x] Docker Compose 골격 (base / dev / prod)
- [x] Nginx 설정 (SSE 스트리밍 포함)
- [x] 문서화 (ARCHITECTURE, ADR, SETUP)
- [x] frontend 초기화 (Expo + 웹 지원)
- [x] backend 초기화 (Spring Boot 3.5 + JWT + FCM 의존성)
- [x] ai 초기화 (FastAPI + Ollama + Qdrant 연동 골격)

### 환경 결정 사항 (확정)
- 로컬: 코딩만, 실행은 GPU 서버에서 확인
- 서버: 초기엔 dev 단일 환경, 추후 디렉토리로 dev/prod 분리
- 배포: 수동 (git pull + docker compose up)
- 브랜치: main + feature/xxx → PR → merge
- Ollama: 로컬/서버 모두 동일 모델 사용 (URL만 .env로 분리)
- LLM: qwen2.5:8b / 임베딩: bona/bge-m3 (1024차원)

### 다음 단계 (Phase 1 진입 전)
- [ ] `.env.dev` 생성 및 Docker Compose 전체 기동 확인
- [ ] backend DB 연결 확인 (application.yml)

---

## Phase 1 — 핵심 기능 + AI 허브

### Backend (Spring Boot)

**인증**
- [ ] JWT 발급/검증 필터 구현
- [ ] 로그인 API (`POST /api/auth/login`)
- [ ] Refresh Token 구현

**사용자**
- [ ] User 엔티티 + Repository
- [ ] 내 정보 조회 API

**게시판**
- [ ] 게시글 CRUD API
- [ ] 파일 첨부 업로드

**전자결재**
- [ ] 결재 상신 API
- [ ] 결재 승인/반려 API
- [ ] 결재선 설정
- [ ] FCM 알림 연동

**주간보고**
- [ ] 주간보고 작성/조회 API

### Frontend (Expo)

**공통**
- [ ] React Navigation 설정 (웹 + 모바일)
- [ ] JWT 저장/갱신 (expo-secure-store + axios 인터셉터)
- [ ] 공통 레이아웃 컴포넌트 (NavRail, TabBar, 패널)

**화면**
- [ ] 로그인 화면
- [ ] AI 채팅 메인 화면 (WelcomeScreen + 채팅)
- [ ] 게시판 목록/상세/작성
- [ ] 전자결재 목록/상세/상신 폼
- [ ] 주간보고 작성/조회
- [ ] 푸시 알림 수신 (expo-notifications)

### AI (FastAPI)

- [ ] Ollama 스트리밍 연동 확인
- [ ] 기본 채팅 API (`POST /ai/chat`) SSE 스트리밍
- [ ] 의도 분류 (결재/게시판/주간보고/일반)
- [ ] 의도별 응답 + 바로가기 액션 반환

---

## Phase 2

- [ ] 캘린더 및 일정관리
- [ ] 회의실 예약 (시각화)
- [ ] 차량 예약 (시각화)

## Phase 3

- [ ] 증명서 출력
- [ ] 권한관리
- [ ] 관리자 화면
- [ ] RAG (내규 문서 검색)

---

## AI 자율도 원칙

| 액션 유형 | 자율도 |
|---|---|
| 조회 (일정, 결재목록 등) | AI가 직접 응답 |
| 상신/신청 | 초안 채우고 사용자 확인 후 실행 |
| 승인/반려 | 항상 명시적 확인 필요 |
