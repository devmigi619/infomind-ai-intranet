# WHITEBOARD

## Active Tasks

| # | Item | Status |
|---|---|---|
| 1 | Technology stack | ✅ Complete |
| 2 | Architecture design | ✅ Complete |
| 3 | Project setup | ✅ Complete |
| 4 | Git repository + GitHub | ✅ Complete |
| 5 | Documentation formalization | ✅ Complete |
| 6 | Phase 1 development | 🔜 Next |

## Next Steps

1. Deploy to GPU server → run full Docker Compose stack → verify all services healthy
2. Begin Phase 1 development — see `docs/PLAN.md` for feature checklist
3. Recommended first task: Backend JWT filter + Login API (`POST /api/auth/login`)

---

## Confirmed Decisions

### Product Direction
- AI chatbot hub-centered groupware / business portal
- AI autonomy by action weight: read=auto / submit=confirm / approve=explicit

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend + Mobile | Expo (React Native Web) |
| Business Backend | Spring Boot 3.5 (Java 21) |
| AI Backend | FastAPI (Python 3.11) |
| LLM | Ollama — Qwen 2.5 8B (on-premise) |
| DB | PostgreSQL 16 + Qdrant |
| Notifications | FCM + SSE |
| Infrastructure | Docker Compose, on-premise GPU server |
| Redis | Deferred — add in Phase 3 if needed |

### Architecture — JWT Delegation Pattern

```
[Expo] → [Nginx] → [Spring Boot]  (Business APIs, JWT issuance)
                 → [FastAPI]      (AI chat SSE, JWT self-validation)
[Spring Boot] → [PostgreSQL]
[FastAPI]     → [Qdrant] + [Ollama]
```

### Development Phases

- **Phase 1**: Electronic approval + weekly report + bulletin board + AI chat
- **Phase 2**: Calendar, meeting room reservation, vehicle reservation
- **Phase 3**: Certificate printing, role management, admin screen, RAG

### Team

- Dev team: 3 (lead × 1, engineer × 2)
- Target users: ~35 employees
