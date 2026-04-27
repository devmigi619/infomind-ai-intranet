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
├── docs/        # 아키텍처, 개발계획
└── sample/      # UI 와이어프레임 (참고용)
```

## 사전 요구사항

**GPU 서버**
- Docker Engine 26+ (Docker Compose 플러그인 포함)
- NVIDIA GPU 드라이버 + nvidia-container-toolkit
- Git

**로컬 워크스테이션**
- Node.js 20+ (Expo)
- JDK 21+ (Spring Boot IDE 지원)
- Python 3.11+ (FastAPI IDE 지원)

## 실행

### 로컬 개발 (서비스별 직접 실행)

```bash
# Frontend
cd frontend && npm install && npx expo start

# Backend (Spring Boot)
cd backend && ./gradlew bootRun

# AI (FastAPI)
cd ai && uvicorn app.main:app --reload
```

### 전체 스택 (Docker Compose — GPU 서버)

```bash
git clone <repo-url>
cd infomind-ai-intranet

cp .env.example .env.dev
# .env.dev 편집 — DB_PASSWORD, JWT_SECRET 필수 설정

cd infra
docker compose -f docker-compose.yml --env-file ../.env.dev up -d

# Ollama 모델 다운로드 (최초 1회)
docker exec -it infra-ollama-1 ollama pull qwen2.5:8b
docker exec -it infra-ollama-1 ollama pull bona/bge-m3
```

### 서비스 확인

```bash
curl http://localhost/api/actuator/health   # Spring Boot
curl http://localhost/ai/health             # FastAPI
docker exec infra-ollama-1 ollama list      # Ollama 모델
```

### 업데이트 (GPU 서버)

```bash
git pull
cd infra
docker compose -f docker-compose.yml --env-file ../.env.dev up -d --build
```

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 서비스 구조, 라우팅, 인증 흐름, 환경변수, 기술 선택 근거 |
| [PLAN.md](docs/PLAN.md) | 개발 페이즈 및 기능 체크리스트 |
