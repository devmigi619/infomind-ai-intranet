# Architecture

## Service Topology

```
[Expo Web / Mobile]
        │ HTTPS
    [Nginx :80/443]
    ┌───┴────────────────┐
[Spring Boot :8080]   [FastAPI :8000]
  - JWT issuance          - JWT validation (shared secret)
  - Business APIs         - AI chat (SSE streaming)
  - FCM dispatch          - RAG pipeline
  - SSE (web notify)      - Ollama inference
        │                       │
  [PostgreSQL :5432]    [Qdrant :6333]
                        [Ollama :11434]
```

All services run within a single Docker Compose network (`infomind-net`). No service port is exposed to the host except Nginx.

## Service Roles

| Service | Role | Internal Port |
|---|---|---|
| nginx | Reverse proxy, TLS termination, routing | 80 / 443 |
| spring-boot | Business APIs, JWT issuance, FCM | 8080 |
| fastapi | AI chat, RAG, Ollama integration | 8000 |
| postgresql | Business relational data | 5432 |
| qdrant | Vector search (RAG) | 6333 |
| ollama | On-premise LLM server | 11434 |

## Routing Rules

| Path Prefix | Upstream |
|---|---|
| `/api/*` | spring-boot |
| `/ai/*` | fastapi (SSE: `proxy_buffering off`) |
| `/` | Expo static build |

## Authentication Flow

1. **Login** — Client `POST /api/auth/login` → Spring Boot validates credentials → issues JWT (HS256, shared secret).
2. **Business API** — Client sends `Authorization: Bearer <token>` → Nginx forwards to Spring Boot → Spring Boot validates JWT.
3. **AI chat** — Client sends `Authorization: Bearer <token>` → Nginx forwards to FastAPI → FastAPI validates JWT independently using the same shared secret. Spring Boot is not in the request path, enabling direct SSE streaming.

**Rationale**: See [ADR-003](adr/003-auth-jwt-delegation.md).

**Token invalidation**: Immediate invalidation on logout is not supported without a Redis token blacklist. Accepted trade-off for Phase 1; re-evaluate in Phase 3.

## Notification Strategy

| Scenario | Mechanism |
|---|---|
| Mobile app in background | FCM (via Firebase Admin SDK in Spring Boot) |
| Web browser, real-time | SSE endpoint on Spring Boot |

## AI Autonomy Policy

Actions are classified by operational weight:

| Action Type | Behavior |
|---|---|
| Read (schedules, approval lists, etc.) | AI responds directly |
| Submit / Apply | AI drafts payload; user confirms before execution |
| Approve / Reject | Explicit user confirmation always required |

## Models

| Purpose | Model | Dimensions |
|---|---|---|
| LLM (chat, reasoning) | `qwen2.5:8b` | — |
| Text embedding (RAG) | `bona/bge-m3` | 1024 |

The same models are used on both local development machines and the production GPU server. Only the `OLLAMA_URL` environment variable changes between environments.

## Infrastructure

- **Runtime**: Single on-premise GPU server with NVIDIA GPU.
- **Orchestration**: Docker Compose (base file + environment override files).
- **Environment separation**: `.env.dev` / `.env.prod` passed via `--env-file`.
- **Deployment**: Manual — `git pull` → `docker compose up -d`.
- **Volumes**: `postgres-data`, `qdrant-data`, `ollama-models` (persistent across container restarts).
