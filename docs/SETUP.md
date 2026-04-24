# 개발환경 설정

## 사전 요구사항
- Docker Desktop
- Node.js 20+
- JDK 21+
- Python 3.11+
- NVIDIA GPU 드라이버 + nvidia-container-toolkit (Ollama GPU 사용 시)

## 최초 설정

```bash
# 1. 환경변수 파일 생성
cp .env.example .env.dev

# 2. .env.dev 값 채우기 (DB 비밀번호, JWT 시크릿 등)

# 3. 서비스 실행
cd infra
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ../.env.dev up -d

# 4. Ollama 모델 다운로드 (최초 1회)
docker exec -it infra-ollama-1 ollama pull qwen2.5:8b
```

## 서비스별 개발 실행 (로컬 PC 직접 실행 — Docker 없이 빠른 개발용)

```bash
# Frontend (Expo)
cd frontend && npx expo start

# Backend (Spring Boot)
cd backend && ./gradlew bootRun

# AI (FastAPI)
cd ai && uvicorn main:app --reload
```

## 환경별 실행

```bash
# 개발
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ../.env.dev up

# 운영
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file ../.env.prod up
```
