# Conventions

## Git

### Branch Naming

```
feature/<short-description>     New feature
fix/<short-description>         Bug fix
refactor/<short-description>    Refactoring without behavior change
docs/<short-description>        Documentation only
chore/<short-description>       Build, dependency, config changes
```

Examples:
```
feature/auth-jwt-filter
feature/approval-submit-api
fix/sse-connection-drop
docs/api-approval
```

### Commit Message Format

```
<type>: <subject>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

Rules:
- Subject line: imperative mood, no period, 72 characters max
- Write in Korean is acceptable; be consistent within a PR
- Reference issue numbers when applicable: `feat: 전자결재 상신 API (#12)`

Examples:
```
feat: JWT 발급/검증 필터 구현
fix: SSE 연결 종료 시 스트림 정리
docs: ARCHITECTURE 인증 흐름 보완
chore: Spring Boot 의존성 업데이트
```

### Pull Request Rules

- PRs merge into `main` only via GitHub PR — direct push to `main` is prohibited.
- PR title follows the same commit message format.
- At least one reviewer approval required before merge.
- PR description must include: what changed, how to test.

---

## API Design

### URL Structure

```
/api/{resource}              Collection
/api/{resource}/{id}         Single resource
/api/{resource}/{id}/{sub}   Sub-resource
```

Examples:
```
POST   /api/auth/login
GET    /api/approvals
POST   /api/approvals
GET    /api/approvals/{id}
POST   /api/approvals/{id}/approve
POST   /api/approvals/{id}/reject
GET    /api/posts
POST   /api/posts
```

AI service paths are prefixed with `/ai/`:
```
POST   /ai/chat
GET    /ai/health
```

### HTTP Methods

| Method | Semantics |
|---|---|
| `GET` | Read — no side effects |
| `POST` | Create or trigger action |
| `PUT` | Full replace |
| `PATCH` | Partial update |
| `DELETE` | Delete |

### Response Format (Spring Boot)

Success:
```json
{
  "data": { ... }
}
```

Error:
```json
{
  "code": "APPROVAL_NOT_FOUND",
  "message": "해당 결재 건을 찾을 수 없습니다."
}
```

HTTP status codes map to error categories:
- `400` — Validation / bad request
- `401` — Authentication required
- `403` — Forbidden
- `404` — Resource not found
- `500` — Server error

---

## Backend (Spring Boot)

### Package Structure

```
com.infomind
├── domain
│   └── {domain}           # approval, post, user, report, ...
│       ├── controller
│       ├── service
│       ├── repository
│       ├── entity
│       └── dto
├── global
│   ├── auth               # JWT filter, SecurityConfig
│   ├── exception          # GlobalExceptionHandler
│   └── config             # Beans, CORS, etc.
```

### Naming

| Element | Convention | Example |
|---|---|---|
| Class | PascalCase | `ApprovalService` |
| Method | camelCase | `submitApproval()` |
| Variable | camelCase | `approvalId` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| DB column | snake_case | `created_at` |
| API DTO | Suffix `Request` / `Response` | `ApprovalSubmitRequest` |

### Entity Rules

- All entities extend or include `createdAt` and `updatedAt` (via `@EntityListeners(AuditingEntityListener.class)`).
- Use `Long` for primary keys.
- Avoid bidirectional associations unless necessary; prefer unidirectional.

---

## AI Backend (FastAPI)

### Module Structure

```
ai/
└── app/
    ├── api/           # Route handlers
    ├── services/      # Business logic, Ollama / Qdrant calls
    ├── core/          # Config, auth, dependencies
    └── models/        # Pydantic schemas
```

### Naming

| Element | Convention |
|---|---|
| File | `snake_case.py` |
| Class | `PascalCase` |
| Function / variable | `snake_case` |
| Pydantic model | Suffix `Request` / `Response` |

### Streaming Endpoints

- All chat endpoints return `StreamingResponse` with `media_type="text/event-stream"`.
- SSE format: `data: <json>\n\n`, terminated with `data: [DONE]\n\n`.

---

## Frontend (Expo)

### Directory Structure

```
frontend/
└── app/
    ├── (tabs)/        # Tab navigation screens
    ├── components/    # Shared UI components
    ├── hooks/         # Custom React hooks
    ├── services/      # API client, axios instance
    ├── store/         # State management
    └── types/         # TypeScript type definitions
```

### Naming

| Element | Convention |
|---|---|
| Component file | `PascalCase.tsx` |
| Non-component file | `camelCase.ts` |
| Component | PascalCase |
| Hook | `use` prefix — `useApprovals` |
| API service | `camelCase` — `approvalService` |

### Platform Handling

Use `Platform.OS` only when behavior must differ between web and native. Prefer Expo SDK abstractions (`expo-router`, `expo-secure-store`) over platform-specific APIs.

---

## Environment Variables

### Naming Convention

```
{SERVICE}_{SCOPE}_{NAME}
```

Examples: `DB_PASSWORD`, `JWT_SECRET`, `OLLAMA_URL`, `EMBEDDING_DIMENSIONS`

### Rules

- Never commit `.env.*` files (all are in `.gitignore`).
- All variables consumed by services must be declared in `.env.example` with a description comment.
- Sensitive values (passwords, secrets) must not have default values in `.env.example`.
