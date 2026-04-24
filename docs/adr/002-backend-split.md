# ADR-002: Backend — Spring Boot + FastAPI Split

**Status**: Accepted

## Decision

Business logic runs on Spring Boot (Java 21). AI and RAG workloads run on FastAPI (Python 3.11) as a separate service.

## Context

The system requires both complex business workflow logic (electronic approval with multi-level approval chains, FCM notifications) and AI capabilities (LLM inference, RAG, streaming). A single backend technology cannot serve both optimally.

## Rationale

| Concern | Spring Boot | FastAPI |
|---|---|---|
| Approval workflow, JPA, Spring Security | ✅ Mature, well-suited | ❌ Significantly more effort |
| LangChain, Qdrant client, async streaming | ❌ Limited ecosystem | ✅ Native Python AI ecosystem |
| Team familiarity | ✅ Java background | Acceptable learning curve |

Isolating the AI layer means model or strategy changes (e.g., switching from Ollama to an external API) have zero impact on business logic.

## Trade-offs

| Factor | Impact |
|---|---|
| Operational complexity | Two Docker services to maintain instead of one |
| Inter-service latency | Spring Boot → FastAPI calls over the internal Docker network; negligible at this scale |
| Shared JWT secret | Required by the JWT Delegation Pattern (see ADR-003) |

## Rejected Alternatives

- **Python-only backend**: Spring Security has no Python equivalent. Implementing complex approval workflow logic and authentication in Python would be significantly more difficult.
- **Java-only backend (no FastAPI)**: Integrating LangChain and Qdrant in Java is possible but the ecosystem maturity gap compared to Python is large.
