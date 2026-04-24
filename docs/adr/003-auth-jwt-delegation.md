# ADR-003: 인증 — JWT 위임 패턴

## 결정
JWT를 Spring Boot에서 발급, FastAPI에서 공유 시크릿으로 자체 검증

## 이유
- Spring Boot: 단일 인증 권한 (발급/관리)
- FastAPI: Spring Boot 호출 없이 독립 검증 → SSE 스트리밍 직접 연결 가능
- A안(Spring Boot 경유 스트리밍)은 버퍼링 문제
- B안(FastAPI 자체 인증)은 사용자 정보 이중 관리 문제

## 트레이드오프
- FastAPI가 JWT 시크릿을 공유받아야 함 → .env로 관리
- 로그아웃 즉시 토큰 무효화 불가 (Redis 블랙리스트 없을 시)
