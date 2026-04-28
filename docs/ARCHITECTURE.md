# 아키텍처

## 서비스 구조 (로컬 개발)

```
[브라우저 :8081 (Expo Web)]
        │
        ├── /api/* ───► [Spring Boot :8080]
        │                  │
        │                  └── JWT 발급, 업무 API
        │                       └── H2 (인메모리, local 프로파일)
        │
        └── /ai/*  ───► [FastAPI :8000]  ← 선택 (Ollama 설치 시만)
                          │
                          └── JWT 자체검증 (Spring과 시크릿 공유)
                              SSE 스트리밍
                              └── [Ollama :11434]
```

각 서비스는 호스트 OS에서 직접 실행하며, 포트가 그대로 노출된다 (Nginx 없음).

## 서비스 구조 (운영기)

```
[인터넷]
    │
    ▼
[Nginx :443 / :80]  ← SSL 종단, 리버스 프록시
    │
    ├── /api/*  ──► [Spring Boot :8080]
    │                   │
    │                   └── JWT 발급, 업무 API
    │                        └── PostgreSQL :5432
    │
    ├── /ai/*   ──► [FastAPI :8000]
    │                   │
    │                   └── JWT 자체검증 (공유 시크릿)
    │                       SSE 스트리밍
    │                       └── [Ollama :11434]  ← GPU 서버 내부
    │
    └── /*      ──► [Expo Web 정적 파일 (빌드 결과물)]
```

Nginx 역할:
- 단일 도메인(`https://infomind.example.com`)에서 모든 서비스 라우팅
- SSL 종단 처리 (Let's Encrypt)
- `/ai/chat` SSE 엔드포인트: `proxy_buffering off`, `X-Accel-Buffering: no` 필수
- 정적 파일(`/`): `npx expo export --platform web` 결과물 서빙

## 서비스 역할

| 서비스 | 역할 | 로컬 포트 |
|---|---|---|
| Frontend (Expo Web) | UI | 8081 |
| Spring Boot | 업무 API, JWT 발급, FCM | 8080 |
| FastAPI | AI 채팅, RAG, Ollama 연동 (선택) | 8000 |
| H2 (인메모리) | 로컬 DB — Spring Boot 안에서 실행 | — |
| Ollama | 로컬 LLM (선택, 직접 설치) | 11434 |

> PostgreSQL / Qdrant / Nginx / Docker Compose 통합은 **GPU 개발기 / 운영기에서 사용**. 로컬에서는 사용하지 않음. 추후 정비 예정.

## 라우팅

로컬에서는 클라이언트가 각 서비스를 **직접** 호출한다.

| 경로 | 목적지 |
|---|---|
| `http://localhost:8080/api/*` | Spring Boot |
| `http://localhost:8000/ai/*` | FastAPI |
| `http://localhost:8081/` | Expo Web |

> 운영기에서는 Nginx 리버스 프록시를 통해 단일 도메인에서 라우팅. (추후 정비)

## 인증 흐름

1. `POST /api/auth/login` → Spring Boot가 JWT 발급 (HS256, 공유 시크릿)
2. 업무 API → Spring Boot에서 JWT 검증
3. AI 채팅 → FastAPI가 동일 시크릿으로 JWT 자체 검증 → SSE 직접 스트리밍

**JWT 위임 패턴 채택 근거**: Spring Boot를 통한 SSE 중계는 응답 버퍼링으로 불가. FastAPI 자체 인증은 사용자 정보 이중 관리 문제. 공유 시크릿 방식으로 두 문제를 모두 해결.

**트레이드오프**: `JWT_SECRET`을 두 서비스에 환경변수로 주입해야 하며, Redis 토큰 블랙리스트 없이는 즉시 로그아웃 무효화 불가 (내부 시스템 + 8시간 만료로 감수).

## 데이터베이스

### 로컬
- **H2 인메모리** (`application-local.yml`)
  - JDBC URL: `jdbc:h2:mem:infomind`
  - 콘솔: `http://localhost:8080/h2-console` (User: `sa`, Password: 빈칸)
  - 매 기동 시 스키마 재생성 (`ddl-auto: create-drop`)
  - `DataInitializer`가 테스트 계정 `admin`/`user1` 자동 생성

### 운영기 (추후)
- PostgreSQL 16 (Docker Compose)
- 영구 볼륨 `postgres-data`

## AI / LLM

### 로컬 (선택)
- **Ollama** 직접 설치 → `ollama pull qwen2.5:8b`
- FastAPI가 `http://localhost:11434`로 호출
- Ollama 미설치 시 AI 채팅만 동작 안 함 (다른 기능은 정상)

### 운영기 (추후)
- Docker Compose 안의 Ollama 컨테이너
- GPU 서버에서 실행

## 모델

| 용도 | 모델 | 차원 |
|---|---|---|
| 채팅 / 추론 | `qwen2.5:8b` | — |
| 텍스트 임베딩 | `bona/bge-m3` (Phase 3 RAG에서 사용) | 1024 |

## 알림

| 상황 | 방식 |
|---|---|
| 모바일 백그라운드 | FCM (Firebase Admin SDK, Spring Boot) |
| 웹 실시간 | SSE (FastAPI 채팅 응답) |

> 로컬에서는 FCM 키 미설정 시 알림 발송이 비활성화됨 (정상 동작). 실 알림 테스트는 FCM 키 발급 + 운영기 배포 후.

## AI 자율도

| 액션 유형 | 동작 |
|---|---|
| 조회 (일정, 결재목록 등) | AI가 직접 응답 |
| 상신 / 신청 | AI가 초안 작성 → 사용자 확인 후 실행 |
| 승인 / 반려 | 항상 명시적 사용자 확인 필요 |

## 환경변수

각 생태계의 표준 패턴을 따른다.

### Backend (Spring Boot 표준)

**로컬**: `backend/src/main/resources/application-local.yml` 에 직접 박힌 더미 값 사용.
```yaml
jwt:
  secret: local-dev-secret-key-must-be-at-least-32-characters
  expiry-hours: 8
```
git clone 후 바로 실행 가능. `.env.local` 불필요.

**운영기** (추후): `application-prod.yml` 에 placeholder + 환경변수 주입.
```yaml
jwt:
  secret: ${JWT_SECRET}
```
Docker `-e JWT_SECRET=...`, K8s Secret, Vault 등으로 주입.

### Frontend (Expo 표준 — `.env.local`)

`frontend/.env.example` 을 `frontend/.env.local` 로 복사 후 사용. `.gitignore` 등록됨.

| 변수 | 예시 값 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | 백엔드 API URL |

`frontend/src/shared/api/client.ts` 가 읽음. 없으면 즉시 throw.

### AI / FastAPI (Python 표준 — `.env.local`)

`ai/.env.example` 을 `ai/.env.local` 로 복사 후 사용 (AI 서비스 띄울 때만). pydantic-settings 가 자동 로드.

| 변수 | 예시 값 | 설명 |
|---|---|---|
| `JWT_SECRET` | (Backend와 동일 값) | Spring Boot 와 공유. 토큰 검증용 |
| `OLLAMA_URL` | `http://localhost:11434` | 로컬 Ollama |
| `LLM_MODEL` | `qwen2.5:8b` | 채팅 모델 |
| `EMBEDDING_MODEL` | `bona/bge-m3` | 임베딩 (Phase 3 RAG) |

**JWT_SECRET 일치 필수**: Backend가 발급한 토큰을 AI가 검증해야 하므로, `application-local.yml` 의 `jwt.secret` 과 `ai/.env.local` 의 `JWT_SECRET` 이 같은 값이어야 함.

### 운영기 (추후 정비 예정)

운영기에서는 모두 환경변수로 명시 주입 필요.

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | HS256 서명 키 (최소 32자). Spring Boot·FastAPI 공유 |
| `JWT_EXPIRY_HOURS` | | `8` | 액세스 토큰 유효 시간 (시간) |
| `DB_HOST` | ✅ | — | PostgreSQL 호스트 |
| `DB_PORT` | | `5432` | |
| `DB_NAME` | | `infomind` | |
| `DB_USERNAME` | ✅ | — | |
| `DB_PASSWORD` | ✅ | — | |
| `LLM_MODEL` | | `qwen2.5:8b` | Ollama 채팅 모델 |
| `EMBEDDING_MODEL` | | `bona/bge-m3` | Ollama 임베딩 모델 |
| `EMBEDDING_DIMENSIONS` | | `1024` | 임베딩 차원 |
| `ALLOWED_ORIGINS` | | `*` | CORS 허용 출처 |
| `FCM_SERVICE_ACCOUNT_KEY` | | _(빈값)_ | Firebase 서비스 계정 키 경로. 비어있으면 FCM 비활성 |

---

## 기술 선택 근거

| 결정 | 채택 | 근거 | 트레이드오프 |
|---|---|---|---|
| 프론트엔드 | Expo (React Native Web) | 단일 코드베이스로 웹+모바일, 푸시 알림 신뢰성 | 일부 SDK 웹 미지원 |
| 백엔드 분리 | Spring Boot + FastAPI | 결재 워크플로우는 Spring Boot, AI 스트리밍은 FastAPI 적합 | 서비스 2개 운영 |
| 클라이언트 상태 | Zustand | 가벼움, 학습 곡선 낮음, 작은 팀에 적합 | Redux 대비 표준화 약함 |
| 서버 상태 | React Query (TanStack Query) | 캐싱/refetch/invalidation 표준 | — |
| 로컬 DB | H2 (인메모리) | 별도 설치 없이 즉시 실행 | 재시작 시 데이터 초기화 |
| 운영 DB | PostgreSQL 16 | 표준, 풀텍스트 검색, JSON 지원 | — |
| 벡터 DB | Qdrant | 메타데이터 필터링, LangChain 어댑터 | 별도 서비스 운영 |
| Redis | 초기 미사용 | 35명 규모에서 불필요 | 즉시 로그아웃 무효화 불가 |
