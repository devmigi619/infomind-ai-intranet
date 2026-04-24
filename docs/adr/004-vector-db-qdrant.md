# ADR-004: Vector Database — Qdrant

**Status**: Accepted

## Decision

Use Qdrant as the vector database for RAG, in preference to pgvector.

## Context

The RAG pipeline requires similarity search over embedded documents (internal regulations, notices). The retrieval must support metadata filtering — e.g., filter by department, document type, or date range — in addition to vector similarity.

## Rationale

- **Native metadata filtering**: Qdrant provides first-class payload filtering that runs alongside vector search in a single query. pgvector requires a separate SQL WHERE clause, which can bypass the index and degrade performance on filtered searches.
- **Python client**: `qdrant-client` integrates naturally with the FastAPI codebase. LangChain provides a built-in Qdrant vector store adapter.
- **Scalability**: Qdrant is purpose-built for vector workloads. If the document corpus grows significantly, Qdrant scales more predictably than pgvector.

## Trade-offs

| Factor | Impact |
|---|---|
| Additional Docker service | One more container to operate alongside PostgreSQL |
| Operational overhead | Separate volume (`qdrant-data`) and health monitoring |
| Performance difference vs. pgvector | Negligible at 35-user scale; Qdrant advantage grows with document volume |

## Rejected Alternatives

- **pgvector**: Simpler operationally (reuses existing PostgreSQL), but metadata filtering support is weaker and the Python client experience is less ergonomic for RAG workloads.
