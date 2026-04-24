# Infomind AI Intranet

AI-hub-centered groupware for internal business operations. Provides natural language access to workflows including electronic approvals, bulletin boards, weekly reports, and scheduling.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend / Mobile | Expo (React Native Web) — web + iOS + Android unified codebase |
| Business Backend | Spring Boot 3.5 (Java 21) |
| AI Backend | FastAPI (Python 3.11) |
| LLM | Ollama — Qwen 2.5 8B (on-premise) |
| Relational DB | PostgreSQL 16 |
| Vector DB | Qdrant |
| Push Notifications | FCM (mobile background) |
| Real-time Streaming | SSE (web) |
| Infrastructure | Docker Compose, on-premise GPU server |

## Architecture

```
[Expo Web / Mobile]
        │ HTTPS
    [Nginx]
    ┌───┴───────────┐
[Spring Boot]    [FastAPI]
  JWT issuance     JWT self-validation (shared secret)
  Business logic   AI chat (SSE streaming)
  FCM dispatch     RAG / Qdrant
        │                │
  [PostgreSQL]      [Qdrant] [Ollama]
```

**Auth pattern**: Spring Boot issues JWTs; FastAPI validates the same JWT using the shared secret, enabling direct SSE connections without proxy buffering. See [ADR-003](docs/adr/003-auth-jwt-delegation.md).

## Repository Structure

```
infomind-ai-intranet/
├── frontend/        # Expo application
├── backend/         # Spring Boot application
├── ai/              # FastAPI application
├── infra/           # Docker Compose files, Nginx configuration
├── docs/            # Architecture, ADRs, development plan, conventions
└── sample/          # UI wireframes (reference only)
```

## Quick Start

```bash
# 1. Configure environment variables
cp .env.example .env.dev
# Edit .env.dev — set DB credentials, JWT secret, etc.

# 2. Start all services (GPU server)
cd infra
docker compose -f docker-compose.yml --env-file ../.env.dev up -d

# 3. Pull Ollama models (first run only)
docker exec -it infra-ollama-1 ollama pull qwen2.5:8b
docker exec -it infra-ollama-1 ollama pull bona/bge-m3
```

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions.

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Service topology, routing, auth flow |
| [PLAN.md](docs/PLAN.md) | Development phases and feature checklist |
| [SETUP.md](docs/SETUP.md) | Environment setup and deployment |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Branch naming, commit format, coding standards |
| [ADR Index](docs/adr/) | Architecture decision records |
