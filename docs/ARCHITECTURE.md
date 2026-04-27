# 아키텍처

## 서비스 구조

```
[Expo 웹/모바일]
       │ HTTPS
   [Nginx :80/443]
   ┌───┴──────────────┐
[Spring Boot :8080]  [FastAPI :8000]
  JWT 발급              JWT 자체검증 (공유 시크릿)
  업무 API              AI 채팅 (SSE 스트리밍)
  FCM 발송              RAG / Qdrant
       │                     │
 [PostgreSQL :5432]   [Qdrant :6333] [Ollama :11434]
```

모든 서비스는 단일 Docker 네트워크(`infomind-net`) 내에서 실행된다. Nginx 외 포트는 호스트에 노출되지 않는다.

## 서비스 역할

| 서비스 | 역할 | 내부 포트 |
|---|---|---|
| nginx | 리버스 프록시, 라우팅 | 80 / 443 |
| spring-boot | 업무 API, JWT 발급, FCM | 8080 |
| fastapi | AI 채팅, RAG, Ollama 연동 | 8000 |
| postgresql | 업무 데이터 | 5432 |
| qdrant | 벡터 검색 (RAG) | 6333 |
| ollama | 온프레미스 LLM 서버 | 11434 |

## 라우팅

| 경로 | 목적지 |
|---|---|
| `/api/*` | spring-boot |
| `/ai/*` | fastapi (SSE: `proxy_buffering off`) |
| `/` | Expo 정적 빌드 |

## 인증 흐름

1. `POST /api/auth/login` → Spring Boot가 JWT 발급 (HS256, 공유 시크릿)
2. 업무 API → Spring Boot에서 JWT 검증
3. AI 채팅 → FastAPI가 동일 시크릿으로 JWT 자체 검증 → SSE 직접 스트리밍

**JWT 위임 패턴 채택 근거**: Spring Boot를 통한 SSE 중계는 응답 버퍼링으로 불가. FastAPI 자체 인증은 사용자 정보 이중 관리 문제. 공유 시크릿 방식으로 두 문제를 모두 해결.

**트레이드오프**: `JWT_SECRET`을 두 서비스에 환경변수로 주입해야 하며, Redis 토큰 블랙리스트 없이는 즉시 로그아웃 무효화 불가 (내부 시스템 + 8시간 만료로 감수).

## 알림

| 상황 | 방식 |
|---|---|
| 모바일 백그라운드 | FCM (Firebase Admin SDK, Spring Boot) |
| 웹 실시간 | SSE (Spring Boot) |

## 모델

| 용도 | 모델 | 차원 |
|---|---|---|
| 채팅 / 추론 | `qwen2.5:8b` | — |
| 텍스트 임베딩 | `bona/bge-m3` | 1024 |

## 인프라

- 온프레미스 GPU 서버 1대
- Docker Compose로 전체 서비스 관리
- 환경 분리: `--env-file .env.dev` / `--env-file .env.prod`
- 볼륨: `postgres-data`, `qdrant-data`, `ollama-models` (컨테이너 재시작 시 유지)

## AI 자율도

| 액션 유형 | 동작 |
|---|---|
| 조회 (일정, 결재목록 등) | AI가 직접 응답 |
| 상신 / 신청 | AI가 초안 작성 → 사용자 확인 후 실행 |
| 승인 / 반려 | 항상 명시적 사용자 확인 필요 |

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | HS256 서명 키 (최소 32자). Spring Boot·FastAPI 공유. |
| `JWT_EXPIRY_HOURS` | | `8` | 액세스 토큰 유효 시간 (시간) |
| `DB_NAME` | | `infomind` | PostgreSQL 데이터베이스명 |
| `DB_USERNAME` | | `infomind` | PostgreSQL 사용자 |
| `DB_PASSWORD` | ✅ | — | PostgreSQL 비밀번호 |
| `LLM_MODEL` | | `qwen2.5:8b` | Ollama 채팅 모델 |
| `EMBEDDING_MODEL` | | `bona/bge-m3` | Ollama 임베딩 모델 |
| `EMBEDDING_DIMENSIONS` | | `1024` | 임베딩 벡터 차원 (모델과 일치해야 함) |
| `ALLOWED_ORIGINS` | | `http://localhost:8081` | CORS 허용 출처 (쉼표 구분) |
| `FCM_SERVER_KEY` | | _(빈값)_ | Firebase 서버 키. 비어있으면 FCM 비활성화. |

---

## 기술 선택 근거

| 결정 | 채택 | 근거 | 트레이드오프 |
|---|---|---|---|
| 프론트엔드 | Expo (React Native Web) | 웹 DOM 직접 렌더링 (Flutter CanvasKit 대비 그룹웨어 기능에 유리), 단일 코드베이스, Expo Go로 초기 비용 없음 | 모바일 네이티브 완성도 Flutter 대비 미세하게 낮음, 일부 Expo SDK 웹 미지원 |
| 백엔드 분리 | Spring Boot + FastAPI | 결재 워크플로우·JPA·Security는 Spring Boot 적합, LangChain·Qdrant·비동기 스트리밍은 FastAPI 적합. AI 레이어 분리로 모델 교체 시 업무 로직 무영향 | Docker 서비스 2개 운영, 내부 네트워크 통신 지연 (이 규모에서 무시 가능) |
| 벡터 DB | Qdrant | 메타데이터 필터링 단일 쿼리 처리 (pgvector는 별도 SQL WHERE 필요), Python 클라이언트 + LangChain 어댑터 기본 제공 | PostgreSQL과 별도 Docker 서비스 운영 |
| Redis | 초기 미사용 | JWT 블랙리스트·RAG 캐시·Rate limiting 모두 35명 규모에서 불필요. 즉시 로그아웃 무효화 요구 또는 RAG 반복 쿼리 지연 발생 시 추가 | 로그아웃 후 만료 전까지 토큰 유효, RAG 반복 쿼리 시 매번 Ollama 추론 |
