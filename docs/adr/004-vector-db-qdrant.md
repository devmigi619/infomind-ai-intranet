# ADR-004: 벡터 DB — Qdrant

## 결정
RAG용 벡터 DB로 pgvector 대신 Qdrant 사용

## 이유
- 메타데이터 필터링이 네이티브 지원 (부서별, 날짜별 내규 검색)
- FastAPI Python 클라이언트(qdrant-client) 매우 자연스러움
- RAG 고도화 시 확장성 우위

## 트레이드오프
- Docker 서비스 추가 (postgresql과 별도)
- pgvector 대비 속도 차이는 이 규모(35명)에서 체감 불가
