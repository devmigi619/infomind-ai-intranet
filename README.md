# Infomind 사내 업무포탈

AI 허브 중심의 그룹웨어. 자연어 대화로 업무에 접근하는 새로운 패러다임.

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 + 모바일 | Expo (React Native Web) |
| 백엔드 (업무로직) | Spring Boot 3.5 (Java 21) |
| 백엔드 (AI/RAG) | FastAPI (Python 3.11) |
| LLM | Ollama (Qwen 2.5 8B, 온프레미스) |
| 관계형 DB | PostgreSQL 16 |
| 벡터 DB | Qdrant |
| 알림 | FCM (모바일) + SSE (웹) |
| 인프라 | Docker Compose, 온프레미스 GPU 서버 |

## 아키텍처

```
[Expo 웹/모바일]
       ↓ HTTPS
   [Nginx]
    ↙              ↘
[Spring Boot]     [FastAPI]
 - JWT 발급         - JWT 검증
 - 업무 로직        - AI 채팅 (SSE 스트리밍)
 - FCM 발송         - RAG / Qdrant
    ↓                    ↓
[PostgreSQL]          [Qdrant]
                      [Ollama]
```

## 프로젝트 구조

```
infomind-ai-intranet/
├── frontend/    # Expo 앱
├── backend/     # Spring Boot
├── ai/          # FastAPI
├── infra/       # Docker Compose, Nginx
├── docs/        # 설계문서, ADR, 개발계획
└── sample/      # UI 와이어프레임 (참고용)
```

## 빠른 시작

```bash
# 1. 환경변수 설정
cp .env.example .env.dev
# .env.dev 값 채우기

# 2. 전체 서비스 실행
cd infra
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ../.env.dev up -d

# 3. Ollama 모델 다운로드 (최초 1회)
docker exec -it infra-ollama-1 ollama pull qwen2.5:8b
```

## 문서

- [아키텍처](docs/ARCHITECTURE.md)
- [개발 계획](docs/PLAN.md)
- [개발환경 설정](docs/SETUP.md)
- [의사결정 기록](docs/adr/)
