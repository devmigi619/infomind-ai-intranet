# WHITEBOARD

## 진행 중인 작업
| # | 항목 | 상태 |
|---|---|---|
| 1 | 기술스택 결정 | ✅ 완료 |
| 2 | 아키텍처 설계 | ✅ 완료 |
| 3 | 프로젝트 셋업 | ✅ 완료 |
| 4 | Phase 1 개발 | 🔜 다음 |

## 다음 할 일
1. 팀 회의: 로컬/개발/운영 환경 분리 방식 결정
2. `.env.dev` 생성 → Docker Compose 전체 기동 확인
3. Phase 1 개발 시작 → 상세 내용: `docs/PLAN.md`

---

## 확정 사항

### 제품 방향
- AI 챗봇 허브 중심 그룹웨어/업무포탈
- AI 자율도: 액션 무게 기준 (조회 자율 / 상신 확인 / 승인 명시)

### 기술 스택
| 레이어 | 기술 |
|---|---|
| 프론트엔드 + 모바일 | Expo (React Native Web) |
| 백엔드 (업무로직) | Spring Boot 3.5 (Java 21) |
| 백엔드 (AI/RAG) | FastAPI (Python 3.11) |
| LLM | Ollama (Qwen 2.5 8B, 온프레미스) |
| DB | PostgreSQL 16 + Qdrant |
| 알림 | FCM + SSE |
| 인프라 | Docker Compose, 온프레미스 GPU 서버 1대 |
| Redis | 초기 미사용, 필요 시 추가 |

### 아키텍처 (C안 — JWT 위임 패턴)
```
[Expo] → [Nginx] → [Spring Boot] (업무 API, JWT 발급)
                 → [FastAPI]     (AI 채팅 SSE, JWT 자체검증)
[Spring Boot] → [PostgreSQL]
[FastAPI]     → [Qdrant] + [Ollama]
```

### 개발 페이즈
- **Phase 1**: 전자결재 + 주간보고 + 게시판 + AI 채팅
- **Phase 2**: 캘린더, 회의실, 차량 예약
- **Phase 3**: 증명서 출력, 권한관리, 관리자 화면

### 팀
- 부장 1인 + 사원 2인 (총 3명), 대상 사용자 약 35명
