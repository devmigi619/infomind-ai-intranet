# Infomind 사내 업무포탈

AI 허브 중심 그룹웨어. 자연어로 결재·게시판·주간보고 등 업무에 접근한다.

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 + 모바일 | Expo (React Native Web) |
| 백엔드 (업무로직) | Spring Boot 3.5 (Java 21) |
| 백엔드 (AI/RAG) | FastAPI (Python 3.11) |
| LLM | Ollama — Qwen 2.5 8B (온프레미스) |
| 관계형 DB | PostgreSQL 16 |
| 벡터 DB | Qdrant |
| 알림 | FCM (모바일) + SSE (웹) |
| 인프라 | Docker Compose, 온프레미스 GPU 서버 |

## 프로젝트 구조

```
infomind-ai-intranet/
├── frontend/    # Expo 앱
├── backend/     # Spring Boot
├── ai/          # FastAPI
├── infra/       # Docker Compose, Nginx
├── docs/        # 설계문서, ADR, 개발계획, 컨벤션
└── sample/      # UI 와이어프레임 (참고용)
```

## 실행

```bash
# 전체 스택 (GPU 서버)
cd infra && docker compose -f docker-compose.yml --env-file ../.env.dev up -d

# 프론트엔드만 (로컬)
cd frontend && npx expo start
```

자세한 설정은 [SETUP.md](docs/SETUP.md) 참조.

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 서비스 구조, 라우팅, 인증 흐름, AI 자율도 |
| [SETUP.md](docs/SETUP.md) | 환경 설정 및 실행 방법 |
| [PLAN.md](docs/PLAN.md) | 개발 페이즈 및 기능 체크리스트 |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | 브랜치, 커밋, 코드 스타일 |
| [adr/](docs/adr/) | 아키텍처 의사결정 기록 |
