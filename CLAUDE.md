# Infomind 프로젝트 — 에이전트 지침

## 참조 문서

| 문서 | 참조 시점 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 서비스 구조, 라우팅, 인증 흐름 파악 시 |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | 코드 작성 전 반드시 확인 |
| [PLAN.md](docs/PLAN.md) | 현재 개발 단계 및 구현 대상 확인 시 |
| [SETUP.md](docs/SETUP.md) | 환경변수 및 실행 환경 확인 시 |

## 코드 작성 규칙

모든 규칙은 [CONVENTIONS.md](docs/CONVENTIONS.md)를 따른다.

## 아키텍처 핵심 제약

- **FastAPI 인증**: JWT를 Spring Boot에 검증 요청하지 않는다. `JWT_SECRET`으로 자체 검증한다. (`ai/app/core/auth.py` 참조)
- **SSE 스트리밍**: FastAPI 채팅 엔드포인트는 반드시 `StreamingResponse`로 응답한다. 일반 Response 사용 금지.
- **서비스 간 호출**: Spring Boot ↔ FastAPI 직접 호출 없음. 클라이언트가 각각 호출한다.
- **DB 접근 범위**: Spring Boot → PostgreSQL만. FastAPI → Qdrant + Ollama만.
