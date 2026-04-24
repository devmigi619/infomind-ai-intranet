# ADR-003: Authentication — JWT Delegation Pattern

**Status**: Accepted

## Decision

Spring Boot issues JWTs. FastAPI validates the same JWT using the shared secret independently, without calling Spring Boot.

## Context

The system has two backend services. AI chat requires SSE (Server-Sent Events) streaming. Three authentication patterns were evaluated.

## Rationale

**Option A — Stream through Spring Boot** (rejected): Client connects to Spring Boot, which proxies to FastAPI. Spring Boot's response buffering breaks SSE streaming.

**Option B — FastAPI owns authentication** (rejected): FastAPI manages its own user store, duplicating user data and creating two sources of truth for identity.

**Option C — JWT Delegation** (selected):
- Spring Boot is the single authority for JWT issuance and user management.
- FastAPI validates incoming JWTs using the same HS256 secret via environment variable injection.
- FastAPI receives all necessary claims (user ID, roles) from the JWT payload — no Spring Boot call required.
- Client connects to FastAPI directly for SSE, with no intermediary buffering.

## Trade-offs

| Factor | Impact |
|---|---|
| Secret sharing | `JWT_SECRET` must be injected into both services via `.env`. Treat as a high-sensitivity credential. |
| Immediate logout invalidation | Not supported without a Redis token blacklist. On logout, tokens remain valid until expiry. Accepted for Phase 1; re-evaluate in Phase 3. |

## Implementation Notes

- Algorithm: HS256
- Secret minimum length: 32 characters
- Claims included in token: `sub` (user ID), `roles`, `iat`, `exp`
- Token lifetime: configurable via `JWT_EXPIRY_HOURS` (default: 8 hours)
