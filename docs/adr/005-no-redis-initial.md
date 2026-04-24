# ADR-005: Redis — Deferred

**Status**: Accepted

## Decision

Redis is not included in the initial deployment. It will be added when a concrete requirement justifies the operational cost.

## Context

Redis is commonly used for JWT token blacklisting, caching, rate limiting, and session storage. Each use case was evaluated against the target scale (35 users).

## Rationale

| Use case | Assessment |
|---|---|
| JWT token blacklist (immediate logout invalidation) | Accepted risk: internal system + 8-hour token expiry. See ADR-003. |
| RAG query cache | Useful, but document corpus is small at launch; cache hit rate will be low. |
| Rate limiting | Unnecessary at 35-user scale. |
| Session cache | No session-based auth in this architecture. |

None of the use cases provide sufficient value to justify adding Redis to the initial stack.

## Criteria for Addition

Add Redis when any of the following conditions is met:

1. Immediate token invalidation on logout becomes a hard requirement.
2. RAG query latency becomes a user-visible problem due to repeated identical queries.
3. A new feature explicitly requires pub/sub or distributed locking.

## Trade-offs

| Factor | Impact |
|---|---|
| Logout token validity | Tokens remain valid until expiry after logout. Accepted for an internal intranet. |
| Repeated RAG queries | Each query triggers a full Ollama inference. Acceptable while document volume is small. |
