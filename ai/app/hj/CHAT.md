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
│   ├── config.py            # hj 전용 설정 (MODEL_DEFINE 포함)
│   ├── database.py          # asyncpg 커넥션 풀 (lazy init)
│   ├── auth.py              # JWT 검증 (verify_token)
│   └── llm.py               # LLM 팩토리 (get_llm / get_slm / get_structured_slm 등)
├── data/
│   └── seed_guardrail.py    # 가드레일 시드 데이터 삽입
├── models/
│   ├── state.py             # GraphState
│   └── intent.py            # IntentResult / PreflightResult / SqlResult
├── services/
│   ├── graph.py             # LangGraph StateGraph
│   ├── guardrail.py         # 가드레일 임베딩 + 유사도 검색
│   ├── prompt.py            # LLM 시스템 프롬프트 모음
│   ├── schema.py            # intent별 테이블 스키마 + 참조쿼리 (동적 주입용)
│   └── tools.py             # LangChain @tool 도구 모음
└── CHAT.md
```

---

## 2. 모델 공급자 (MODEL_DEFINE)

`.env.local`의 `MODEL_DEFINE` 환경변수로 공급자를 전환한다.

| 값 | 공급자 | 용도 |
|----|--------|------|
| `prod` | 사내 GPU (Ollama) | 운영 환경 |
| `dev` | OpenAI | 로컬 개발 |

- `core/llm.py`의 팩토리 함수(`get_llm`, `get_slm`, `get_structured_slm`, `get_sql_slm`)가 공급자를 추상화한다.
- **dev 모드**: 가드레일 임베딩 비활성화(항상 통과), `gpt-4o-mini` 사용.
- **prod 모드**: Ollama + bge-m3 임베딩.

---

## 3. 엔드포인트

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
  "turn_id": "uuid",
  "resume_value": "승인"
}
```

- `session_id` 미전달 시 JWT `sub` (user_id)를 사용.
- `turn_id`는 `/ai/chat` SSE의 `turn_id` 이벤트로 수신한 값. MemorySaver 체크포인트 식별자.
- `resume_value`: 단순 문자열("승인"/"취소") 또는 결재선 JSON `{"decision":"승인","aprvl_list":[...],"ref_list":[]}`.

---

## 4. SSE 이벤트 포맷

프론트엔드와의 계약. **변경 시 프론트엔드도 함께 수정.**

| 이벤트 | 발생 시점 | 필드 |
|--------|----------|------|
| `turn_id` | 스트림 시작 직후 (1회) | `turn_id: str` |
| `meta` | classify 완료 직후 (1회) | `actions: []` |
| `progress` | 각 노드 진입 시 | `status: str`, `detail_status: str` |
| `token` | LLM 토큰 스트리밍 / 재질문 / 실행 미리보기 | `content: str` |
| `interrupt` | interrupt() 호출 시 | `interrupt_type: "human"\|"excu"`, `question?`, `preview?`, `aprvl_list?`, `ref_list?` |
| `done` | 스트림 종료 (항상 마지막) | — |

**정상 흐름:** `turn_id` → `meta` → `progress×N` → `token×N` → `done`

**interrupt 흐름:** `turn_id` → `meta` → `progress×N` → `token` (미리보기/질문) → `interrupt` → `done`
→ 사용자 응답 후 `/ai/chat/resume` 호출 → 새 SSE 스트림 (`token×N` → `done`)

---

## 5. 그래프 구조

```
START → guardrail_input → classify → route ─┬→ node_enrich_context ─┬→ node_search ──────────────────────────┐
              ↓(BLOCKED)                     │                       └→ node_excu_preflight → node_excu        │
          save_history → END                 ├→ node_human ──────────────────────────────────────────── (classify 재진입 or save_history)
                                             └→ node_general ────────────────────────────────────── save_history → END
                                                                                                              │
                                    node_excu → node_excu_confirm ─┬→ save_history → END (취소/완료)          │
                                                                    └→ (interrupt: 승인대기)                   │
                                                                                                              ↓
                                                                              node_generate → guardrail_output → save_history → END
                                                                                                    ↓(BLOCKED)
                                                                                               save_history → END
```

| 노드 | 역할 |
|------|------|
| `guardrail_input` | 입력 가드레일 — 차단 시 save_history → END |
| `classify` | intent + action_type 분류 (structured output) |
| `route` | action_type → 다음 노드 결정 |
| `node_enrich_context` | 날짜 참조 계산 + 참조코드 조회 + 결재선 확보 |
| `node_search` | SQL 생성 → 실행 → context 조립 → node_generate |
| `node_excu_preflight` | excu 전 필수 정보 충족 판단 → 부족 시 interrupt(human) |
| `node_excu` | SQL 생성 + 미리보기 생성 → node_excu_confirm |
| `node_excu_confirm` | interrupt(승인대기) → 승인 시 SQL 실행 → save_history |
| `node_human` | 재질문 생성 → interrupt(human) → classify 재진입 |
| `node_general` | 고정 메시지 반환 → save_history |
| `node_generate` | context 기반 LLM 응답 생성 → guardrail_output |
| `guardrail_output` | 출력 가드레일 — 차단 시 save_history |
| `save_history` | `int_chat_history`에 U/A 메시지 저장 → END |

**라우팅 규칙:** 모든 노드는 `Command(goto=..., update={...})`를 반환한다. `add_conditional_edges` 사용 금지.

**Checkpointer:** `MemorySaver` 사용 — interrupt/resume 상태를 메모리에 저장. 서버 재시작 시 진행 중 세션 소멸.

---

## 6. 상태 (GraphState)

```python
class GraphState(MessagesState):   # messages 필드는 MessagesState가 관리
    user_id: str
    session_id: str
    intent: str | None          # leave / aprv / brd / schd / veh / mtgr / rpt / general
    action_type: str | None     # search / excu / human / general
    context: str | None         # DB 조회 결과 / 비즈니스 데이터
    date_reference: str | None  # node_enrich_context가 계산한 날짜 참조 표 (이후 불변)
    generated_sql: str | None   # node_search / node_excu에서 생성된 SQL
    pending_excu_preview: str | None  # node_excu가 생성한 미리보기 (interrupt 간 유지)
    pending_aprvl_list: list[dict] | None  # 결재자 목록 [{aprvUserId, aprvUserNm, deptNm, jbgdNm}]
    pending_ref_list: list[dict] | None    # 참조자 목록 (동일 형태)
    pending_req_sn: int | None            # 사전 확보한 req_sn (FK 정합성 보장)
    user_embedding: list[float] | None    # 사용자 메시지 임베딩 (벡터 검색용)
    vector_sql: str | None      # 실행된 벡터 검색 SQL (감사 로그용)
    actions: list[dict]         # meta 이벤트용 (현재 항상 [])
    grdl_cd: str | None         # 가드레일 코드
    grdl_se: str | None         # 가드레일 구분 (A=개인정보 B=독성)
    grdl_nm: str | None         # 가드레일 명칭
    tk_use_cnt: int             # 토큰 사용량
    system_status: str          # "OK" | "BLOCKED"
    preflight_retry: int        # excu preflight 재시도 횟수 (0=미시도)
```

초기 messages 순서: `history + [현재 사용자 메시지]` (순서 중요 — 역순 금지)

**date_reference vs context 분리 원칙:**
- `date_reference`: 인프라 정보(날짜 참조 표). node_enrich_context가 1회 계산 후 불변. node_generate 진입 시 context가 SQL 결과로 교체되어도 날짜 정보를 유지.
- `context`: 비즈니스 데이터(DB 조회 결과, 참조 코드, 요청 시퀀스 등). 노드 진행에 따라 갱신됨.

---

## 7. Intent 분류

`node_classify`는 `get_structured_slm(IntentResult)`로 분류한다.

```python
class IntentResult(BaseModel):
    intent: Literal["leave", "aprv", "brd", "schd", "veh", "mtgr", "rpt", "general"]
    action_type: Literal["search", "excu", "human", "general"]
    summary: str  # 내부 로깅용 (한국어)
```

| action_type | 의미 | 다음 노드 |
|---|---|---|
| `search` | DB 조회 | `node_enrich_context` → `node_search` |
| `excu` | 데이터 변경 (INSERT/UPDATE/DELETE) | `node_enrich_context` → `node_excu_preflight` → `node_excu` |
| `human` | 질문 모호 — 재질문 필요 | `node_human` |
| `general` | 일상 대화 | `node_general` |

---

## 8. 컨텍스트 보강 (node_enrich_context)

`search` / `excu` 경로 진입 시 SQL 생성 전에 실행된다.

### 8-1. 날짜 참조 (`state.date_reference`)

`tools.py`의 `build_date_reference()`가 오늘 기준 핵심 상대날짜를 YYYYMMDD로 사전계산한다.

포함 항목: 오늘/내일/모레/어제, 이번주·다음주 각 요일, 이번달·다음달 1일·말일,
이번달·다음달 각 요일 첫등장/마지막등장 (→ "다음달 첫째주 금요일" 등 커버)

**LLM은 직접 계산하지 않고 이 표에서 조회만 한다.**

### 8-2. 참조 코드 (`state.context` 일부)

`schema.py`의 `INTENT_REFERENCE_QUERIES`를 실행해 "표시명=코드값" 컴팩트 매핑으로 주입.

예시: `휴가유형(leave_cd): 연차=LEAVE_00001, 경조사=LEAVE_00002`

**SQL 생성 시 사용자 자연어 → 코드값 변환에 사용.**

### 8-3. 결재선 사전 확보 (leave 등 결재선 필요 intent + excu만)

- `req_sn` 사전 확보 → `state.pending_req_sn` (마스터·상세·결재라인이 동일 값 공유 보장)
- 결재자 목록 → `state.pending_aprvl_list` (interrupt 시 프론트 편집 UI에 전달)

---

## 9. 도구 (Tools)

**모든 도구는 `services/tools.py`에만 정의.**

| 도구/함수 | 설명 |
|----------|------|
| `build_date_reference()` | 오늘 기준 상대날짜 YYYYMMDD 표 생성 |
| `generate_sql(...)` | intent → 스키마 주입 → LLM Text-to-SQL. `date_reference` 파라미터로 날짜 참조 주입 |
| `execute_sql` (`@tool`) | SQL 실행 (SELECT 무조건 허용, DML은 허용 테이블만) |
| `execute_vector_sql(...)` | $1::vector 파라미터 벡터 검색 전용 |
| `fetch_default_aprvl_line(user_id)` | 사용자 기본 결재선 템플릿 조회 |
| `build_aprvl_insert_sqls(...)` | 결재자/참조자 INSERT SQL 코드 생성 (FK 정합 보장) |
| `execute_sql_transaction(sqls, user_id)` | 다중 DML 트랜잭션 실행 (하나라도 실패 시 전체 롤백) |

**DML 허용 테이블:** `tools.py`의 `DML_ALLOWED_TABLES` 집합에서만 관리.
```python
DML_ALLOWED_TABLES: set[str] = {
    "int_pst", "int_pst_cmt",
    "int_leave_req_mst", "int_leave_req_dtl",
    "int_leave_req_aprv", "int_leave_req_ref",
    "int_mtgr_rsv", "int_veh_rsv",
    "int_schd",
}
```

**결재선 INSERT는 코드가 전담 (`build_aprvl_insert_sqls`). LLM이 `int_leave_req_aprv` INSERT를 생성하면 안 됨.**

---

## 10. 동적 스키마 주입

**파일:** `services/schema.py`

intent별로 관련 테이블만 주입해 컨텍스트 낭비를 방지한다.

**스키마 작성 형식:**
```
-- 테이블명: 용도 | PK: 컬럼 | FK(물리): 컬럼 → 참조테이블.컬럼
-- 컬럼: 컬럼명(타입), _SE컬럼(VARCHAR → f_cm_cd('UP_CD')), 날짜컬럼(VARCHAR(8) YYYYMMDD)
```

포함: 컬럼명·타입·PK·FK·코드값·날짜 포맷·f_cm_cd up_cd 연결 / 생략: DEFAULT·NOT NULL·인덱스

**코드 컬럼 조회 원칙:**
- `_CD` / `_ID` 접미사: 마스터 테이블에 **JOIN**하여 코드명 조회 (f_cm_cd 사용 금지)
- `_SE` 접미사: `f_cm_cd('컬럼명대문자', 값)` **2인자** 호출로 코드명 조회

**현재 등록된 intent:** `leave` (8개 테이블), `brd` (7개), `veh` (3개), `mtgr` (3개), `schd` (4개)
**미등록:** `aprv`, `rpt` — 테이블 확정 후 추가 필요

---

## 11. Preflight 검증 (node_excu_preflight)

excu 실행 전 필수 정보가 충족됐는지 `get_structured_slm(PreflightResult)`로 판단한다.

```python
class PreflightResult(BaseModel):
    is_complete: bool           # True=정보 충분 → node_excu 진행
    missing_fields: list[str]   # 누락 항목 목록
    question: str               # 누락 정보를 묻는 자연어 질문
    show_options: list[str] | None  # 선택 가능 항목 (참조 코드에서 추출)
```

**날짜 판단 원칙 (최우선):**
- 상대적 날짜 표현('내일', '다음주 금요일' 등)은 날짜 정보가 있는 것으로 인정
- 단일 날짜 표현 하나는 시작날짜·종료날짜를 **동시에 충족** (시작=종료, 따로 묻지 않음)
- YYYYMMDD 변환은 SQL 생성 단계에서 date_reference 표로 처리

**preflight 필수 항목:** `schema.py`의 `PREFLIGHT_REQUIRED_FIELDS`에서 intent별로 관리.

---

## 12. excu 결재선 처리

결재선이 필요한 intent(`APRVL_LINE_INTENTS` = `{"leave"}`):

1. **node_enrich_context**: `req_sn` 확보 → `state.pending_req_sn`, 결재자 목록 → `state.pending_aprvl_list`
2. **node_excu**: 마스터(`int_leave_req_mst`) + 상세(`int_leave_req_dtl`) SQL만 생성. **결재라인 INSERT는 생성 금지.**
3. **node_excu_confirm**: interrupt payload에 `aprvl_list`/`ref_list` 포함 → 프론트 결재선 편집 UI
4. 승인 시: `build_aprvl_insert_sqls()`로 결재라인 INSERT → `execute_sql_transaction()`으로 단일 트랜잭션 실행

**`APRVL_TABLE_MAP`** (`tools.py`): intent별 마스터·결재·참조 테이블명과 PK 컬럼 매핑. 새 intent 추가 시 여기만 수정.

---

## 13. 시스템 프롬프트

**모든 프롬프트는 `services/prompt.py`에만 정의. 노드 파일에 직접 작성 금지.**

| 상수 | 사용 노드 |
|------|----------|
| `INTENT_SYSTEM_PROMPT` | `node_classify` |
| `PREFLIGHT_SYSTEM_PROMPT` | `node_excu_preflight` (`{required_fields}` 플레이스홀더) |
| `HUMAN_CLARIFY_PROMPT` | `node_human` |
| `EXCU_PREVIEW_PROMPT` | `node_excu` |
| `GENERATE_SYSTEM_PROMPT` | `node_generate` |
| `SQL_GENERATION_PROMPT` | `generate_sql` tool (`{schema}` 플레이스홀더) |

---

## 14. 대화 히스토리 저장

`save_history` 노드가 매 응답마다 `int_chat_history`에 U(사용자) / A(AI) 2개 row를 삽입한다.

| chat_se | 저장 내용 |
|---------|----------|
| `U` | 사용자 메시지 (`messages[-2]`) |
| `A` | AI 응답 (`messages[-1]`) |

저장 실패 시 로그만 기록하고 응답은 계속 진행 (사용자 경험 우선).

---

## 15. 가드레일

```
입력: guardrail_input → 차단(grdl_se="A" or "B") → save_history → END
출력: guardrail_output → 차단 → save_history → END
```

| grdl_se | 의미 | 차단 메시지 |
|---------|------|------------|
| `A` | 개인정보 | "개인정보 보호를 위해 해당 내용에 답변드리기 어렵습니다." |
| `B` | 독성 | "부적절한 표현이 감지되어 답변을 드리기 어렵습니다." |

- DB 테이블: `int_chat_grdl` / 임베딩: `bge-m3` 1024차원 / 차단 임계값: 코사인 유사도 **≥ 0.75**
- **dev 모드(`MODEL_DEFINE=dev`)**: 가드레일 비활성화 (항상 통과). OpenAI 임베딩으로 재시딩 전까지.
- 시드 실행: `python -m app.hj.data.seed_guardrail` (ai/ 디렉토리에서)

---

## 16. 의존성

```
langgraph>=0.2.0
langchain-ollama>=0.2.0
langchain-openai>=0.2.0
asyncpg>=0.29.0
```

---

## 17. 검증

```bash
# 서버 실행
cd ai/ && uvicorn main:app --reload

# 정상 흐름 확인
POST /ai/chat {"message": "내 잔여 연차 알려줘", "session_id": "test-001"}
# 기대: turn_id → meta → progress×N → token×N → done

# interrupt 흐름 확인
POST /ai/chat {"message": "다음주 금요일 휴가 신청해줘", "session_id": "test-002"}
# 기대: turn_id → meta → progress×N → token(미리보기) → interrupt(excu) → done
POST /ai/chat/resume {"turn_id": "<위에서 받은 turn_id>", "resume_value": "승인"}
# 기대: token×N → done

# 그래프 토폴로지 출력
python -c "import asyncio; from app.hj.services.graph import build_graph; g = asyncio.run(build_graph()); print(g.get_graph().draw_ascii())"

# date_reference / schema 검증
python -c "
from app.hj.services.tools import build_date_reference
from app.hj.services.schema import get_schema_for_intent
print(build_date_reference()[:200])
s = get_schema_for_intent('leave')
assert 'APRV_RSLT_SE' in s
print('leave 스키마 OK')
"
```
