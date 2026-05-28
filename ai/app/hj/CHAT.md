# 챗봇 개발 규칙 (ai/app/hj/)

## 1. 범위 원칙

- 챗봇 관련 코드는 **`ai/app/hj/` 하위에만** 작성한다.
- `ai/main.py`, `ai/app/core/`, `ai/app/services/`는 수정하지 않는다.
- `ai/requirements.txt`는 편집 가능.

```
ai/app/hj/
├── api/
│   └── chat.py              # FastAPI 엔드포인트 + SSE 어댑터
├── core/
│   ├── config.py            # hj 전용 설정
│   ├── database.py          # asyncpg 커넥션 풀 (lazy init)
│   └── auth.py              # JWT 검증 (verify_token)
├── data/
│   └── seed_guardrail.py    # 가드레일 시드 데이터 삽입
├── models/
│   ├── state.py             # GraphState
│   └── intent.py            # IntentResult (구조화 출력 스키마)
├── services/
│   ├── graph.py             # LangGraph StateGraph
│   ├── guardrail.py         # 가드레일 임베딩 + 유사도 검색
│   ├── prompt.py            # LLM 시스템 프롬프트 모음
│   ├── schema.py            # intent별 테이블 스키마 (동적 주입용)
│   └── tools.py             # LangChain @tool 도구 모음
└── CHAT.md
```

---

## 2. 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/ai/chat` | 신규 대화 시작 |
| `POST` | `/ai/chat/resume` | interrupt 재개 |

**`/ai/chat` 요청:**
```json
{
  "message": "휴가 신청하고 싶어",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "session_id": "uuid"
}
```

**`/ai/chat/resume` 요청:**
```json
{
  "session_id": "uuid",
  "resume_value": "승인"
}
```

`session_id` 미전달 시 JWT `sub` (user_id)를 사용.

---

## 3. SSE 이벤트 포맷

프론트엔드와의 계약. **변경 시 프론트엔드도 함께 수정.**

| 이벤트 | 발생 시점 | 필드 |
|--------|----------|------|
| `meta` | classify 완료 직후 (1회) | `actions: []` |
| `token` | LLM 토큰 스트리밍 / 재질문 / 실행 미리보기 | `content: str` |
| `interrupt` | interrupt() 호출 시 | `interrupt_type: "human" \| "excu"` |
| `done` | 스트림 종료 (항상 마지막) | — |

**정상 흐름:** `meta` → `token×N` → `done`

**interrupt 흐름:** `meta` → `token` (질문/미리보기) → `interrupt` → `done`
→ 사용자 응답 후 `/ai/chat/resume` 호출 → 새 SSE 스트림 시작

---

## 4. 그래프 구조

```
START → guardrail_input → classify → route →┬→ node_search  ─┐
              ↓(BLOCKED)                     ├→ node_excu   ──┤→ node_generate → save_history → guardrail_output → END
             END                             ├→ node_human  ──┘          ↑              ↓(BLOCKED)
                                             └→ node_general ────────────┘             END
```

| 노드 | 역할 |
|------|------|
| `guardrail_input` | 입력 가드레일 — 차단 시 즉시 END |
| `classify` | intent + action_type 분류 (structured output) |
| `route` | action_type → 다음 노드 결정 |
| `node_search` | SQL 생성 → 실행 → context 조립 |
| `node_excu` | SQL 생성 → 미리보기 → interrupt(승인대기) → 실행 |
| `node_human` | 재질문 생성 → interrupt(답변대기) |
| `node_general` | 고정 메시지 반환 (일상 대화) |
| `node_generate` | context 기반 LLM 응답 생성 |
| `save_history` | `int_chat_history`에 U/A 메시지 저장 |
| `guardrail_output` | 출력 가드레일 — 차단 시 END |

**라우팅 규칙:** 모든 노드는 `Command(goto=..., update={...})`를 반환한다. `add_conditional_edges` 사용 금지.

**Checkpointer:** `MemorySaver` 사용 — interrupt/resume 상태를 메모리에 저장. 서버 재시작 시 진행 중 세션 소멸.

---

## 5. 상태 (GraphState)

```python
class GraphState(MessagesState):   # messages 필드는 MessagesState가 관리
    user_id: str
    session_id: str
    intent: str | None         # leave / aprv / brd / schd / veh / mtgr / rpt / general
    action_type: str | None    # search / excu / human / general
    context: str | None        # DB 조회 결과 or 실행 결과
    generated_sql: str | None  # node_search / node_excu에서 생성된 SQL
    actions: list[dict]        # meta 이벤트용 (현재 항상 [])
    grdl_cd: str | None        # 가드레일 코드
    grdl_se: str | None        # 가드레일 구분 (A=개인정보 B=독성)
    grdl_nm: str | None        # 가드레일 명칭
    tk_use_cnt: int            # 토큰 사용량
    system_status: str         # "OK" | "BLOCKED"
```

초기 messages 순서: `history + [현재 사용자 메시지]` (순서 중요 — 역순 금지)

---

## 6. Intent 분류

`node_classify`는 `llm.with_structured_output(IntentResult)`로 분류한다.

```python
class IntentResult(BaseModel):
    intent: Literal["leave", "aprv", "brd", "schd", "veh", "mtgr", "rpt", "general"]
    action_type: Literal["search", "excu", "human", "general"]
    summary: str  # 내부 로깅용
```

| action_type | 의미 | 다음 노드 |
|---|---|---|
| `search` | DB 조회 | `node_search` |
| `excu` | 데이터 변경 (INSERT/UPDATE/DELETE) | `node_excu` |
| `human` | 질문 모호 — 재질문 필요 | `node_human` |
| `general` | 일상 대화 | `node_general` |

---

## 7. 도구 (Tools)

**모든 도구는 `services/tools.py`에만 정의. `@tool` 데코레이터 필수.**

| 도구 | 설명 |
|------|------|
| `generate_sql` | intent → 스키마 주입 → LLM Text-to-SQL |
| `execute_sql` | SQL 실행 (SELECT 무조건 허용, DML은 허용 테이블만) |

**DML 허용 테이블:** `tools.py`의 `DML_ALLOWED_TABLES` 집합에서만 관리.
```python
DML_ALLOWED_TABLES: set[str] = {
    "int_pst", "int_pst_cmt",
    "int_mtgr_rsv", "int_veh_rsv",
    # 추가 시 여기에만 등록
}
```

---

## 8. 동적 스키마 주입

**파일:** `services/schema.py`

30개 이상 테이블을 모두 프롬프트에 넣으면 컨텍스트 낭비. intent별로 관련 테이블만 주입.

```python
INTENT_SCHEMAS: dict[str, list[str]] = {
    "leave": ["-- int_leave_req_mst: ...", "-- int_leave_pol: ...", ...],
    "brd":   ["-- int_pst: ...", "-- int_com_file_emb: ...", ...],
    "veh":   ["-- int_veh_rsv: ...", ...],
    # ...
}
```

**스키마 작성 형식:**
```
-- 테이블명: 용도 | PK: 컬럼 | FK: 컬럼 → 참조테이블.컬럼
-- 컬럼: 컬럼명(타입), 코드컬럼(VARCHAR: 'A'=설명), 날짜컬럼(VARCHAR(8) YYYYMMDD)
```
포함: 컬럼명·타입·PK·FK·코드값·날짜 포맷 / 생략: DEFAULT·NOT NULL·인덱스

**현재 등록된 intent:** `leave` (8개), `brd` (7개), `veh` (3개), `mtgr` (3개)
**미등록:** `aprv`, `schd`, `rpt` — 테이블 확정 후 추가 필요

---

## 9. 대화 히스토리 저장

`save_history` 노드가 매 응답마다 `int_chat_history`에 U(사용자) / A(AI) 2개 row를 삽입한다.

| chat_se | 저장 내용 |
|---------|----------|
| `U` | 사용자 메시지 (`messages[-2]`) |
| `A` | AI 응답 (`messages[-1]`) |

저장 실패 시 로그만 기록하고 응답은 계속 진행 (사용자 경험 우선).

---

## 10. 가드레일

```
입력: guardrail_input → 차단(grdl_se="A" or "B") → SSE token(고정메시지) + done
출력: guardrail_output → 차단 → SSE token(고정메시지) + done
```

| grdl_se | 의미 | 차단 메시지 |
|---------|------|------------|
| `A` | 개인정보 | "개인정보 보호를 위해 해당 내용에 답변드리기 어렵습니다." |
| `B` | 독성 | "부적절한 표현이 감지되어 답변을 드리기 어렵습니다." |

- DB 테이블: `int_chat_grdl` / 임베딩: `bge-m3` 1024차원 / 차단 임계값: 코사인 유사도 **≥ 0.75**
- 시드 실행: `python -m app.hj.data.seed_guardrail` (ai/ 디렉토리에서)

---

## 11. 시스템 프롬프트

**모든 프롬프트는 `services/prompt.py`에만 정의. 노드 파일에 직접 작성 금지.**

| 상수 | 사용 노드 |
|------|----------|
| `INTENT_SYSTEM_PROMPT` | `node_classify` |
| `HUMAN_CLARIFY_PROMPT` | `node_human` |
| `EXCU_PREVIEW_PROMPT` | `node_excu` |
| `GENERATE_SYSTEM_PROMPT` | `node_generate` |
| `SQL_GENERATION_PROMPT` | `generate_sql` tool (`{schema}` 플레이스홀더 포함) |

---

## 12. 의존성

```
langgraph>=0.2.0
langgraph-checkpoint-postgres>=2.0.0,<3.0.0   # MemorySaver 쓰면 불필요 (현재 설치됨)
psycopg[binary]>=3.1.0                         # 동일
langchain-ollama>=0.2.0
asyncpg>=0.29.0
```

---

## 13. 검증

```bash
# 서버 실행
cd ai/ && uvicorn main:app --reload

# 정상 흐름 확인
POST /ai/chat {"message": "내 잔여 연차 알려줘", "session_id": "test-001"}
# 기대: meta → token×N → done

# interrupt 흐름 확인
POST /ai/chat {"message": "휴가 신청해줘", "session_id": "test-002"}
# 기대: meta → token(미리보기) → interrupt(excu) → done
POST /ai/chat/resume {"session_id": "test-002", "resume_value": "승인"}
# 기대: token×N → done

# 그래프 토폴로지 출력
python -c "import asyncio; from app.hj.services.graph import build_graph; g = asyncio.run(build_graph()); print(g.get_graph().draw_ascii())"
```
