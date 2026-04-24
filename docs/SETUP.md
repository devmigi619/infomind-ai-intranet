# Setup Guide

## Development Model

| Environment | Purpose | Where code runs |
|---|---|---|
| Local workstation | Code authoring, IDE, git | Code only — no server processes |
| GPU server (dev) | Full-stack execution, integration testing | All Docker services |

Developers write code locally and verify behavior on the GPU server. Frontend hot-reload via Expo tunnel is the only exception where a local process is acceptable during UI development.

## Prerequisites

### GPU Server
- Ubuntu 22.04+
- Docker Engine 26+ with Docker Compose plugin
- NVIDIA GPU driver + `nvidia-container-toolkit` (required for Ollama)
- Git

### Local Workstation
- Git
- Node.js 20+ (Expo CLI, frontend development)
- JDK 21+ (Spring Boot — compile and IDE support)
- Python 3.11+ (FastAPI — IDE support)
- Docker Desktop (optional — for local smoke testing without GPU)

## Initial Setup (GPU Server)

```bash
# 1. Clone the repository
git clone <repo-url>
cd infomind-ai-intranet

# 2. Create environment file from template
cp .env.example .env.dev

# 3. Edit .env.dev — set all required values
#    Required: DB_PASSWORD, JWT_SECRET
#    Review: all other values, defaults are provided

# 4. Start all services
cd infra
docker compose -f docker-compose.yml --env-file ../.env.dev up -d

# 5. Pull Ollama models (first run only — large download)
docker exec -it infra-ollama-1 ollama pull qwen2.5:8b
docker exec -it infra-ollama-1 ollama pull bona/bge-m3

# 6. Verify services are healthy
docker compose ps
```

## Service Verification

```bash
# Spring Boot health
curl http://localhost/api/actuator/health

# FastAPI health
curl http://localhost/ai/health

# Ollama models available
docker exec infra-ollama-1 ollama list
```

## Environment Variables Reference

See `.env.example` for the full list with descriptions.

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | HS256 signing key (min 32 chars). Must match across Spring Boot and FastAPI. |
| `JWT_EXPIRY_HOURS` | No | `8` | Access token lifetime in hours |
| `DB_NAME` | No | `infomind` | PostgreSQL database name |
| `DB_USERNAME` | No | `infomind` | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `LLM_MODEL` | No | `qwen2.5:8b` | Ollama model for chat/reasoning |
| `EMBEDDING_MODEL` | No | `bona/bge-m3` | Ollama model for text embedding |
| `EMBEDDING_DIMENSIONS` | No | `1024` | Must match the embedding model output |
| `ALLOWED_ORIGINS` | No | `http://localhost:8081` | CORS allowed origins (comma-separated) |
| `FCM_SERVER_KEY` | No | _(empty)_ | Firebase server key; FCM disabled if empty |

## Frontend Development (Local Expo)

```bash
cd frontend
npm install
npx expo start
```

When testing against the GPU server API, set the API base URL to the server IP in the Expo development build configuration.

## Updating (GPU Server)

```bash
git pull
cd infra
docker compose -f docker-compose.yml --env-file ../.env.dev up -d --build
```

`--build` rebuilds Spring Boot and FastAPI images if their source changed. Omit if only configuration changed.
