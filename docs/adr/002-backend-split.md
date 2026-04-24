# ADR-002: 백엔드 — Spring Boot + FastAPI 분리

## 결정
업무 로직은 Spring Boot, AI/RAG는 FastAPI로 분리

## 이유
- Spring Boot: 복잡한 결재 로직, Spring Security 기반 인증, JPA
- FastAPI: Python AI 생태계 (LangChain, RAG) 활용
- Python 단일 백엔드는 업무 로직 구현에 불리 (Spring Security 대비 취약)
- AI 레이어를 격리하면 모델/전략 교체 시 업무 로직 영향 없음

## 트레이드오프
- Docker 서비스 2개 운영
- 서비스 간 통신 오버헤드 (내부 네트워크라 미미)
