# 아키텍처 개요

## 서비스 구조

```
[Expo 웹/모바일]
       ↓ HTTPS
   [Nginx]
    ↙              ↘
[Spring Boot]     [FastAPI]
 - JWT 발급         - JWT 검증 (공유 시크릿)
 - 업무 로직        - AI 채팅 / RAG
 - FCM 발송         - Ollama 호출
 - SSE              - Qdrant 검색
    ↓                    ↓
[PostgreSQL]          [Qdrant]
                      [Ollama]
```

## 서비스 역할

| 서비스 | 역할 | 포트 (내부) |
|---|---|---|
| nginx | 리버스 프록시, 라우팅 | 80/443 |
| spring-boot | 업무 API, 인증, FCM | 8080 |
| fastapi | AI 채팅, RAG, Ollama 연동 | 8000 |
| postgresql | 업무 데이터 | 5432 |
| qdrant | 벡터 검색 (RAG용) | 6333 |
| ollama | 로컬 LLM 서버 | 11434 |

## 라우팅 규칙

| 경로 | 목적지 |
|---|---|
| `/api/*` | Spring Boot |
| `/ai/*` | FastAPI (SSE 스트리밍) |
| `/` | 프론트엔드 정적 파일 |

## 인증 흐름

1. 로그인 → Spring Boot → JWT 발급
2. 업무 API → Spring Boot에서 JWT 검증
3. AI 채팅 → FastAPI에서 JWT 자체 검증 (공유 시크릿)

## 알림

- 모바일 백그라운드: FCM (expo-notifications)
- 웹 실시간: SSE (Spring Boot)

## 인프라

- 온프레미스 GPU 서버 1대
- Docker Compose로 전체 서비스 관리
- 환경 분리: `.env.dev` / `.env.prod`
