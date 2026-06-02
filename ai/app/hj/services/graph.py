import json
from datetime import datetime

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

from app.hj.core.llm import get_llm, get_slm, get_structured_slm, count_tokens, is_dev
from app.hj.models.state import GraphState
from app.hj.models.intent import IntentResult
from app.hj.services.guardrail import check_guardrail
from app.hj.services.prompt import (
    INTENT_SYSTEM_PROMPT,
    HUMAN_CLARIFY_PROMPT,
    EXCU_PREVIEW_PROMPT,
    GENERATE_SYSTEM_PROMPT,
    PREFLIGHT_SYSTEM_PROMPT,
)
from app.hj.services.schema import get_schema_for_intent, get_preflight_fields
from app.hj.models.intent import PreflightResult
from app.hj.services.tools import parse_llm_json

llm = get_llm(streaming=True)
slm = get_slm(streaming=True)

BLOCK_MESSAGES = {
    "A": "개인정보 보호를 위해 해당 내용에 답변드리기 어렵습니다.",
    "B": "부적절한 표현이 감지되어 답변을 드리기 어렵습니다.",
}
DEFAULT_BLOCK = "요청하신 내용에 답변드리기 어렵습니다."


# ── 가드레일 노드 ────────────────────────────────────────────────────────────

async def node_guardrail_input(state: GraphState) -> Command:
    """사용자 입력 가드레일 — 차단 시 save_history로 라우팅 (GRDL 저장 후 종료)"""
    user_text = state["messages"][-1].content
    hit = await check_guardrail(user_text)
    if hit:
        return Command(
            goto="save_history",
            update={
                "system_status": "BLOCKED",
                "grdl_cd": hit["grdl_cd"],
                "grdl_se": hit["grdl_se"],
                "grdl_nm": hit["emb_ttl"],
            },
        )
    return Command(goto="classify", update={"system_status": "OK"})


async def node_guardrail_output(state: GraphState) -> Command:
    """AI 출력 가드레일 — 검증 후 save_history로 라우팅 (BLOCKED·OK 모두)"""
    ai_text = state["messages"][-1].content
    hit = await check_guardrail(ai_text)
    if hit:
        # BLOCKED: save_history에서 실제 AI 내용 대신 고정 차단 메시지를 저장
        return Command(
            goto="save_history",
            update={
                "system_status": "BLOCKED",
                "grdl_cd": hit["grdl_cd"],
                "grdl_se": hit["grdl_se"],
                "grdl_nm": hit["emb_ttl"],
            },
        )
    return Command(goto="save_history", update={"system_status": "OK"})


# ── 분류 노드 ────────────────────────────────────────────────────────────────

async def node_classify(state: GraphState) -> Command:
    """인텐트 + action_type 분류 — history 포함 전체 대화를 LLM에 전달"""
    structured = get_structured_slm(IntentResult)
    messages = [SystemMessage(content=INTENT_SYSTEM_PROMPT)] + list(state["messages"])

    try:
        response = await structured.ainvoke(messages)
        if is_dev():
            result = response          # OpenAI: Pydantic 모델 직접 반환
            tokens = 0
        else:
            result = parse_llm_json(response.content, IntentResult)
            meta = response.response_metadata or {}
            tokens = count_tokens(meta)
    except Exception:
        return Command(
            goto="save_history",
            update={
                "actions": [],
                "messages": [AIMessage("죄송합니다. 서버 오류로 인해 답변드리기 어렵습니다.")],
            },
        )

    return Command(
        goto="route",
        update={
            "intent": result.intent,
            "action_type": result.action_type,
            "tk_use_cnt": state.get("tk_use_cnt", 0) + tokens,
        },
    )


# ── 라우팅 노드 ──────────────────────────────────────────────────────────────

async def node_route(state: GraphState) -> Command:
    """action_type에 따라 다음 노드를 결정.

    intent == "general" 이면 action_type 무관하게 node_general로 직행한다.
    일상 대화·범위 외 질문은 SQL/excu 흐름을 거치지 않도록 보장.
    """
    if (state.get("intent") or "general") == "general":
        return Command(goto="node_general")

    routes = {
        "search":  "node_enrich_context",   # 날짜·참조 보강 → node_search
        "excu":    "node_enrich_context",   # 날짜·참조 보강 → node_excu_preflight
        "human":   "node_human",
        "general": "node_general",
    }
    action_type = state.get("action_type") or "general"
    return Command(goto=routes.get(action_type, "node_general"))


# ── action_type별 처리 노드 ──────────────────────────────────────────────────

async def node_enrich_context(state: GraphState) -> Command:
    """
    search / excu 공통 컨텍스트 보강 노드.

    1. [날짜 참조] 주입 — build_date_reference()로 상대날짜를 YYYYMMDD로 사전계산
       (SLM이 직접 계산하지 않고 표에서 조회하도록 함)
    2. [참조 코드] 주입 — intent별 마스터 조회 후 "표시명=코드값" 컴팩트 매핑
       (회의실, 휴가유형 등 — SLM이 사용자 표현을 코드값으로 변환하기 쉬움)

    참조 쿼리 실패 시 해당 결과를 조용히 건너뛰고 계속 진행한다.

    분기:
      action_type == excu   → node_excu_preflight
      action_type == search → node_search
    """
    import asyncio
    from app.hj.services.tools import execute_sql, build_date_reference, VECTOR_SEARCH_INTENTS, APRVL_LINE_INTENTS, APRVL_TABLE_MAP, fetch_default_aprvl_line
    from app.hj.services.schema import get_reference_queries
    from app.hj.services.guardrail import embed_text
    from app.hj.core.database import get_pool

    intent = state.get("intent") or "general"
    action_type = state.get("action_type") or "general"
    user_id = state["user_id"]
    existing_ctx = state.get("context") or ""

    parts: list[str] = []

    # ── 1. 날짜 참조 (결정론적 사전계산) — state 전용 필드로 분리 ──────────────
    # context(DB 조회 결과)와 분리해 date_reference 필드에 저장.
    # node_search/excu/excu_preflight/node_generate 에서 별도로 참조한다.
    date_ref = build_date_reference()

    # ── 2. 참조 코드 병렬 조회 → "표시명=코드값" 컴팩트 매핑 ───────────────────
    ref_specs = get_reference_queries(intent)
    if ref_specs:
        async def _run(spec: dict) -> str | None:
            try:
                rows = await execute_sql.ainvoke({"sql": spec["sql"], "user_id": user_id})
                if not rows:
                    return None
                pairs = ", ".join(f"{r.get('nm')}={r.get('cd')}" for r in rows)
                return f"{spec['label']}: {pairs}"
            except Exception:
                return None  # 실패 시 무시

        results = await asyncio.gather(*[_run(s) for s in ref_specs])
        ref_lines = [r for r in results if r]
        if ref_lines:
            parts.append(
                "[참조 코드] 사용자 표현과 일치하는 항목의 코드값(= 뒤)을 INSERT/WHERE에 사용\n"
                + "\n".join(ref_lines)
            )

    # ── 3. (context 병합은 모든 parts 수집 후 마지막에 한 번만 수행) ──────────

    # ── 4. 벡터 검색용 사용자 메시지 임베딩 (afile_id 테이블 있는 intent만) ──
    user_embedding = None
    if intent in VECTOR_SEARCH_INTENTS:
        try:
            last_user_msg = next(
                (
                    m["content"] if isinstance(m, dict) else m.content
                    for m in reversed(state["messages"])
                    if (isinstance(m, dict) and m.get("role") == "user")
                    or (hasattr(m, "type") and m.type == "human")
                ),
                "",
            )
            if last_user_msg:
                user_embedding = await embed_text(last_user_msg)
        except Exception:
            pass  # 임베딩 실패 시 벡터 검색 없이 진행

    # ── 5. 결재선 조회 + req_sn 사전 확보 (결재선 필요 intent + excu일 때만) ──
    # req_sn을 미리 확보해 LLM 생성 SQL의 req_sn 값 = aprv/ref INSERT FK 값 동일 보장.
    pending_aprvl_list = None
    pending_ref_list   = None
    pending_req_sn     = None

    if intent in APRVL_LINE_INTENTS and action_type == "excu":
        try:
            cfg        = APRVL_TABLE_MAP[intent]
            pool       = await get_pool()
            aprvl_data = await fetch_default_aprvl_line(user_id)
            pending_aprvl_list = aprvl_data["aprvl_list"]
            pending_ref_list   = aprvl_data["ref_list"]

            # req_sn 사전 확보
            async with pool.acquire() as conn:
                sn_row = await conn.fetchrow(cfg["pk_sn_query"], user_id)
            pending_req_sn = int(sn_row[0]) if sn_row and sn_row[0] is not None else 1

            # LLM context에 주입 — LLM이 MAX+1 서브쿼리 대신 확정된 값을 사용하도록
            parts.append(
                f"[요청 시퀀스] {cfg['pk_sn_col']}={pending_req_sn} "
                f"(INSERT SQL에서 이 값을 직접 사용할 것 — 서브쿼리 금지)"
            )

            # 결재자가 있으면 context에도 노출 — 미리보기에서 결재자명 언급용(참고 정보).
            # 결재라인 INSERT는 시스템이 자동 처리하므로 LLM은 이 정보로 SQL을 만들지 않는다.
            if pending_aprvl_list:
                names = ", ".join(
                    a.get("aprvUserNm", "")
                    for a in pending_aprvl_list if a.get("aprvUserNm")
                )
                parts.append(
                    f"[기본 결재자] {names} "
                    f"(미리보기 표시용 — int_leave_req_aprv INSERT는 생성하지 말 것)"
                )
        except Exception:
            pass  # 조회 실패 시 결재선 없이 진행 (aprv/ref INSERT 생략됨)

    # context 재병합 (step 5 parts 추가분 반영)
    enriched = "\n\n".join(parts)
    new_context = f"{existing_ctx}\n\n{enriched}".strip() if existing_ctx else enriched

    next_node = "node_excu_preflight" if action_type == "excu" else "node_search"
    return Command(
        goto=next_node,
        update={
            "context":           new_context,
            "date_reference":    date_ref,        # 날짜 참조 표 — 별도 state 필드
            "user_embedding":    user_embedding,
            "pending_aprvl_list": pending_aprvl_list,
            "pending_ref_list":   pending_ref_list,
            "pending_req_sn":     pending_req_sn,
        },
    )


async def node_human(state: GraphState) -> Command:
    """
    모호한 질문 재질문 (human-in-the-loop)
    LLM이 명확화 질문 생성 → interrupt → 사용자 답변 수신 → node_generate로 라우팅
    """
    # 명확화 질문 생성
    messages = [SystemMessage(content=HUMAN_CLARIFY_PROMPT)] + list(state["messages"])
    response = await llm.ainvoke(messages)
    clarify_question = response.content.strip().strip('"\'').strip()

    meta = response.response_metadata or {}
    tokens = count_tokens(meta)

    # 그래프 일시정지 — SSE 어댑터가 on_interrupt 이벤트로 감지 후 프론트에 전달
    user_answer = interrupt({
        "type": "human",
        "question": clarify_question,
    })

    # 취소 키워드 감지
    _CANCEL_KEYWORDS = {"취소", "cancel", "아니요", "아니오", "그만", "stop"}
    if str(user_answer).strip().lower() in _CANCEL_KEYWORDS:
        return Command(
            goto="save_history",
            update={"messages": [AIMessage("요청이 취소되었습니다.")]},
        )

    # 재개: AI 질문 + 사용자 답변을 순서대로 messages에 추가하고 classify 재진입.
    # AI 질문(AIMessage)을 함께 저장해야 classify/이후 노드에서 답변의 맥락을 파악 가능.
    # node_route에서 intent=general → node_general 분기가 생겼으므로
    # 이 시점의 사용자 답변(명확화된 의도)을 다시 분류해 올바른 흐름으로 보낸다.
    # context는 초기화 — node_enrich_context에서 새 intent 기준으로 재보강됨.
    return Command(
        goto="classify",
        update={
            "messages": [
                AIMessage(content=clarify_question),      # AI 질문 먼저 저장
                HumanMessage(content=str(user_answer)),   # 사용자 답변
            ],
            "context":   "",
            "tk_use_cnt": state.get("tk_use_cnt", 0) + tokens,
        },
    )


async def node_excu_preflight(state: GraphState) -> Command:
    """
    excu 실행 전 사전 검증 — SLM 검증만 담당.

    흐름:
      정보 충분 → node_excu
      정보 부족 → question을 GraphState에 저장 후 node_excu_preflight_ask로 라우팅

    [노드 분리 이유]
    MemorySaver resume 시 이 노드가 처음부터 재실행되면서 SLM이 비결정적으로
    is_complete=true를 반환하면 Q&A 코드가 우회된다. interrupt()를 별도 노드
    (node_excu_preflight_ask)로 분리하면, resume 시 ask 노드만 재실행되고
    interrupt()가 즉시 user_answer를 반환하므로 Q&A가 항상 정상 처리된다.
    """
    intent = state.get("intent") or "general"
    context = state.get("context") or ""
    user_message = state["messages"][-1].content

    # ── LLM 사전 검증 ────────────────────────────────────────────────────────
    # 전체 SQL 스키마 대신 필수 입력 항목만 주입 (토큰 절감)
    required_fields = get_preflight_fields(intent)
    preflight_prompt = PREFLIGHT_SYSTEM_PROMPT.format(required_fields=required_fields)

    human_content = f"intent={intent}, user_id={state['user_id']}\n질문: {user_message}"
    if date_ref := state.get("date_reference"):
        human_content += f"\n\n{date_ref}"
    if context:
        human_content += f"\n\n[추가 컨텍스트]\n{context}"

    slm_pf = get_structured_slm(PreflightResult, "llm")
    response = await slm_pf.ainvoke([
        SystemMessage(content=preflight_prompt),
        HumanMessage(content=human_content),
    ])
    try:
        result = response if is_dev() else parse_llm_json(response.content, PreflightResult)
    except Exception:
        return Command(
            goto="save_history",
            update={"messages": [AIMessage("죄송합니다. 서버 오류로 인해 답변드리기 어렵습니다.")]},
        )

    # ── 라우팅 결정 ──────────────────────────────────────────────────────────
    if result.is_complete:
        return Command(goto="node_excu", update={"preflight_retry": 0, "pending_preflight_question": None})

    # 정보 부족 — 질문 텍스트 조립
    question = result.question or (
        f"다음 정보를 알려주세요: {', '.join(result.missing_fields)}"
        if result.missing_fields else "조금 더 자세히 설명해 주시겠어요?"
    )
    if result.show_options:
        question += f"\n선택 가능: {', '.join(result.show_options)}"

    # ★ interrupt() 호출 전에 question을 GraphState에 저장하고 ask 노드로 라우팅.
    # ask 노드에서 interrupt()가 호출되므로, resume 시 ask 노드만 재실행되어
    # pending_preflight_question을 읽어 Q&A를 항상 정상 처리할 수 있다.
    return Command(
        goto="node_excu_preflight_ask",
        update={"pending_preflight_question": question},
    )


async def node_excu_preflight_ask(state: GraphState) -> Command:
    """
    excu preflight interrupt 전담 노드 — 사용자 답변 수집 후 Q&A를 context에 누적.

    MemorySaver resume 시 이 노드만 재실행되어 interrupt()가 즉시 user_answer를 반환.
    Q&A를 context에 추가한 뒤 node_excu_preflight로 재진입해 완전한 context로 SLM 재검증.
    """
    question = state.get("pending_preflight_question") or ""
    context  = state.get("context") or ""
    retry    = state.get("preflight_retry", 0)
    intent   = state.get("intent") or "general"

    # ── 사용자 답변 수집 (interrupt) ─────────────────────────────────────────
    user_answer = interrupt({
        "type": "human",
        "question": question,
    })

    # ── 취소 키워드 감지 ──────────────────────────────────────────────────────
    _CANCEL_KEYWORDS = {"취소", "cancel", "아니요", "아니오", "그만", "stop"}
    if str(user_answer).strip().lower() in _CANCEL_KEYWORDS:
        return Command(
            goto="save_history",
            update={"messages": [AIMessage("요청이 취소되었습니다.")]},
        )

    # ── 의도 재확인 ───────────────────────────────────────────────────────────
    # 짧은 단답("연차요")은 기존 intent 유지, 완전히 다른 요청은 node_route로 분기
    slm_recheck = get_structured_slm(IntentResult)
    recheck_msgs = (
        [SystemMessage(content=INTENT_SYSTEM_PROMPT)]
        + list(state["messages"])
        + [HumanMessage(content=str(user_answer))]
    )
    recheck_resp = await slm_recheck.ainvoke(recheck_msgs)
    try:
        recheck = recheck_resp if is_dev() else parse_llm_json(recheck_resp.content, IntentResult)
        if recheck.intent != intent or recheck.action_type != state.get("action_type"):
            return Command(
                goto="node_route",
                update={
                    "intent":                    recheck.intent,
                    "action_type":               recheck.action_type,
                    "context":                   "",
                    "preflight_retry":           0,
                    "pending_preflight_question": None,
                    "pending_aprvl_list":        None,
                    "pending_ref_list":          None,
                    "pending_req_sn":            None,
                    "messages":                  [HumanMessage(content=str(user_answer))],
                },
            )
    except ValueError:
        pass  # 재분류 실패 시 기존 preflight 흐름 유지

    # ── Q&A 쌍을 context에 누적 후 node_excu_preflight 재진입 ─────────────────
    # Q&A를 먼저 context에 추가한 뒤 SLM을 호출하므로 SLM이 항상 완전한 정보를 봄
    qa_entry = f"[추가 정보]\nQ: {question}\nA: {user_answer}"
    new_context = f"{context}\n{qa_entry}".strip() if context else qa_entry

    return Command(
        goto="node_excu_preflight",
        update={
            "context":                   new_context,
            "preflight_retry":           retry + 1,
            "pending_preflight_question": None,
        },
    )


async def node_search(state: GraphState) -> Command:
    """
    search: SQL 생성(SqlResult) → 실행 → 결과를 context에 담아 node_generate로 라우팅.
    - missing_info가 있으면 context에 주의 메시지 추가.
    - user_embedding이 있으면 VECTOR_SEARCH_SQL 고정 템플릿으로 벡터 검색 병렬 실행 후 섹션 분리 병합.
    """
    import asyncio
    from app.hj.services.tools import generate_sql, execute_sql, execute_vector_sql, VECTOR_SEARCH_SQL

    user_message = state["messages"][-1].content
    intent = state.get("intent") or "general"
    user_id = state["user_id"]
    ctx = state.get("context") or ""

    # SQL 생성 (SqlResult 구조체)
    sql_result = await generate_sql(
        intent=intent,
        action_type="search",
        user_message=user_message,
        user_id=user_id,
        context=ctx,
        date_reference=state.get("date_reference") or "",
    )
    sql = sql_result.sql

    # ── 일반 SQL + 벡터 SQL 병렬 실행 ────────────────────────────────────────
    user_embedding = state.get("user_embedding")

    async def _run_sql() -> tuple[list[dict] | int | None, str | None]:
        try:
            rows = await execute_sql.ainvoke({"sql": sql, "user_id": user_id})
            return rows, None
        except Exception as e:
            return None, str(e)

    async def _run_vector() -> list[dict]:
        # user_embedding이 있을 때만 실행 (VECTOR_SEARCH_INTENTS에 속한 intent에서만 생성됨)
        if not user_embedding:
            print("[VECTOR] user_embedding 없음 → 벡터 검색 skip")
            return []
        print(f"[VECTOR] 벡터 검색 시작 — embedding 차원: {len(user_embedding)}")
        try:
            rows = await execute_vector_sql(VECTOR_SEARCH_SQL, user_embedding)
            print(f"[VECTOR] 벡터 검색 완료 — 결과 {len(rows)}건")
            if rows:
                for r in rows[:3]:  # 최대 3건만 출력
                    print(f"[VECTOR]   similarity={r.get('similarity', '?'):.4f} | {str(r.get('emb_ttl', ''))[:50]}")
            return rows
        except Exception as e:
            print(f"[VECTOR] 벡터 검색 예외 발생: {type(e).__name__}: {e}")
            return []  # 벡터 검색 실패 시 무시하고 일반 결과만 반환

    (rows, sql_err), vector_rows = await asyncio.gather(
        _run_sql(), _run_vector()
    )

    # ── 결과 섹션 병합 ────────────────────────────────────────────────────────
    ctx_parts: list[str] = []

    if sql_err:
        ctx_parts.append(f"조회 중 오류가 발생했습니다: {sql_err}")
    elif rows:
        block = json.dumps(rows, ensure_ascii=False, default=str)
        if sql_result.missing_info:
            missing_str = ", ".join(sql_result.missing_info)
            block += f"\n[주의: 일부 정보가 부족해 결과가 정확하지 않을 수 있습니다 — {missing_str}]"
        ctx_parts.append(f"[정확 조회 결과]\n{block}")

    if vector_rows:
        ctx_parts.append(
            "[첨부파일 내용 검색 결과 — 사용자 질문과 관련 있는 경우에만 참고하고, 무관하면 무시할 것]\n"
            + json.dumps(vector_rows, ensure_ascii=False, default=str)
        )

    context = "\n\n".join(ctx_parts) if ctx_parts else "조회 결과가 없습니다."

    # vector_sql: 실제 실행된 경우에만 감사 로그용으로 저장
    executed_vector_sql = VECTOR_SEARCH_SQL if vector_rows else None

    return Command(
        goto="node_generate",
        update={
            "context": context,
            "generated_sql": sql,
            "vector_sql": executed_vector_sql,
        },
    )


async def node_excu(state: GraphState) -> Command:
    """
    excu 1단계: SQL 생성 + 자연어 미리보기 생성 → state에 저장 → node_excu_confirm으로 라우팅.

    is_executable=False 이면 실행 없이 오류 메시지를 node_generate로 전달한다.

    [분리 이유]
    MemorySaver는 interrupt() 호출 시 해당 노드를 resume 때 처음부터 재실행한다.
    이전 단일 노드 구조에서는 generate_sql()이 재실행돼 다른 SQL이 실행되는 버그가 발생했다.
    SQL 생성(node_excu)과 interrupt+실행(node_excu_confirm)을 분리하면,
    resume 시 node_excu_confirm만 재실행되므로 state에 저장된 SQL을 그대로 사용한다.
    """
    from app.hj.services.tools import generate_sql

    user_message = state["messages"][-1].content
    intent = state.get("intent") or "general"
    user_id = state["user_id"]
    ctx = state.get("context") or ""

    # DML SQL 생성 (SqlResult 구조체)
    sql_result = await generate_sql(
        intent=intent,
        action_type="excu",
        user_message=user_message,
        user_id=user_id,
        context=ctx,
        date_reference=state.get("date_reference") or "",
    )
    sql = sql_result.sql

    # 실행 불가 판정 (핵심 정보 여전히 미확보)
    if not sql_result.is_executable:
        missing_str = ", ".join(sql_result.missing_info) if sql_result.missing_info else "알 수 없음"
        return Command(
            goto="node_generate",
            update={"context": f"필요한 정보가 부족해 실행할 수 없습니다. 누락 정보: {missing_str}"},
        )

    # 자연어 미리보기 생성 (SQL 직접 노출 없이)
    preview_messages = [
        SystemMessage(content=EXCU_PREVIEW_PROMPT),
        *list(state["messages"]),
        SystemMessage(content=f"[생성된 실행 내용]\n{sql}"),
    ]
    preview_response = await llm.ainvoke(preview_messages)
    preview_text = preview_response.content.strip().strip('"\'').strip()

    meta = preview_response.response_metadata or {}
    tokens = count_tokens(meta)

    # SQL과 미리보기를 state에 저장한 뒤 confirm 노드로 라우팅
    # → interrupt/resume 사이에 generate_sql()이 재실행되지 않도록 보장
    return Command(
        goto="node_excu_confirm",
        update={
            "generated_sql": sql,
            "pending_excu_preview": preview_text,
            "tk_use_cnt": state.get("tk_use_cnt", 0) + tokens,
        },
    )


async def node_excu_confirm(state: GraphState) -> Command:
    """
    excu 2단계: state에서 SQL/미리보기를 읽어 사용자 승인 대기 → 실행 or 취소.

    MemorySaver resume 시 이 노드만 재실행된다.
    generate_sql()을 재호출하지 않으므로 preview에서 보여준 SQL과 실제 실행 SQL이 항상 동일.

    결재선 처리 (APRVL_LINE_INTENTS):
      - interrupt payload에 aprvl_list/ref_list 포함 → 프론트 결재선 편집 UI 표시
      - resume_value: JSON {"decision":"승인","aprvl_list":[...],"ref_list":[...]}
        또는 단순 문자열 "승인" (결재선 없는 일반 excu 하위 호환)
      - 승인 시: 메인 SQL + aprv/ref INSERT를 단일 트랜잭션으로 실행
    """
    from app.hj.services.tools import (
        APRVL_LINE_INTENTS, build_aprvl_insert_sqls, execute_sql_transaction,
    )

    sql          = state.get("generated_sql") or ""
    preview_text = state.get("pending_excu_preview") or "실행 내용을 확인해 주세요."
    user_id      = state["user_id"]
    intent       = state.get("intent") or ""

    # ── interrupt 페이로드 구성 ────────────────────────────────────────────────
    interrupt_payload: dict = {"type": "excu", "preview": preview_text}

    aprvl_list_state = state.get("pending_aprvl_list")
    ref_list_state   = state.get("pending_ref_list")

    if aprvl_list_state is not None:    # APRVL_LINE_INTENTS에 속한 intent일 때만 포함
        interrupt_payload["aprvl_list"] = aprvl_list_state
        interrupt_payload["ref_list"]   = ref_list_state or []

    # 사용자 승인 대기 — SSE에서 on_interrupt 이벤트로 프론트에 전달
    user_decision = interrupt(interrupt_payload)

    # ── resume_value 파싱 ─────────────────────────────────────────────────────
    # JSON 구조체: {"decision": "승인", "aprvl_list": [...], "ref_list": [...]}
    # 단순 문자열: "승인" / "취소" (결재선 없는 일반 excu 또는 구버전 프론트)
    try:
        parsed     = json.loads(user_decision)
        decision   = parsed.get("decision", "")
        aprvl_list = parsed.get("aprvl_list", aprvl_list_state or [])
        ref_list   = parsed.get("ref_list",   ref_list_state   or [])
    except (json.JSONDecodeError, TypeError):
        decision   = str(user_decision)
        aprvl_list = aprvl_list_state or []
        ref_list   = ref_list_state   or []

    approved = decision.strip().lower() in ("yes", "승인", "확인", "실행", "y")

    # 취소: save_history로 바로 종료
    if not approved:
        return Command(
            goto="save_history",
            update={
                "messages":             [AIMessage(content="취소되었습니다.")],
                "pending_excu_preview": None,
                "pending_aprvl_list":   None,
                "pending_ref_list":     None,
                "pending_req_sn":       None,
            },
        )

    # ── 승인: 메인 SQL + 결재선 INSERT를 단일 트랜잭션으로 실행 ─────────────────
    try:
        main_sqls  = [sql]
        aprvl_sqls: list[str] = []

        req_sn = state.get("pending_req_sn")
        if intent in APRVL_LINE_INTENTS and req_sn is not None:
            # aprv intent: 3번째 PK(aprv_form_id)를 LLM 생성 SQL에서 추출
            form_id: str | None = None
            if intent == "aprv":
                import re as _re
                m = _re.search(
                    r"INSERT\s+INTO\s+int_aprv_req\s*\([^)]*\)\s*VALUES\s*\(\s*'([^']+)'",
                    sql, _re.IGNORECASE,
                )
                form_id = m.group(1) if m else None

            aprvl_sqls = build_aprvl_insert_sqls(
                intent, user_id, req_sn, aprvl_list, ref_list, user_id,
                form_id=form_id,
            )

        all_sqls = main_sqls + aprvl_sqls
        result   = await execute_sql_transaction(all_sqls, user_id)
        ai_msg   = f"처리가 완료되었습니다. ({result}건)"

    except PermissionError as e:
        ai_msg = f"권한 오류로 실행할 수 없습니다. ({e})"
    except Exception as e:
        ai_msg = f"실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. ({e})"

    return Command(
        goto="save_history",
        update={
            "messages":             [AIMessage(content=ai_msg)],
            "pending_excu_preview": None,
            "pending_aprvl_list":   None,
            "pending_ref_list":     None,
            "pending_req_sn":       None,
        },
    )


async def node_general(state: GraphState) -> Command:
    """일상 대화 — 고정 메시지 반환 (generate 없이 바로 save_history)"""
    fixed_msg = "일상적인 질문으로 보입니다. 답변드리기 어렵습니다."
    return Command(
        goto="save_history",
        update={"messages": [AIMessage(content=fixed_msg)]},
    )


# ── 응답 생성 노드 ───────────────────────────────────────────────────────────

async def node_generate(state: GraphState) -> Command:
    """컨텍스트 기반 LLM 응답 생성 — 생성 후 guardrail_output으로 라우팅"""
    intent = state.get("intent", "general").strip()
    action_type = state.get("action_type", "general").strip()
    context   = state.get("context") or "관련 정보를 찾을 수 없습니다."
    date_ref  = state.get("date_reference") or ""
    # node_search/excu 이후 context는 SQL 결과로 교체되어 날짜 참조가 사라지므로
    # date_reference 필드에서 별도 주입해 응답 생성 시 날짜 정보가 유지되도록 한다.
    full_context = f"{date_ref}\n\n{context}" if date_ref else context
    system_msg = f"{GENERATE_SYSTEM_PROMPT}\n\n[컨텍스트]\n{full_context}\n====추가내용====\n[intent]\n{intent}\n[action_type]\n{action_type}"

    messages = [SystemMessage(content=system_msg)] + list(state["messages"])
    response = await slm.ainvoke(messages)

    meta = response.response_metadata or {}
    tokens = count_tokens(meta)

    return Command(
        goto="guardrail_output",
        update={
            "messages": [AIMessage(content=response.content)],
            "tk_use_cnt": state.get("tk_use_cnt", 0) + tokens,
        },
    )


# ── 대화 히스토리 저장 노드 ──────────────────────────────────────────────────

async def node_save_history(state: GraphState) -> Command:
    """
    int_chat_history에 사용자(U) + AI(A) 메시지를 저장하고 END로 종료.

    진입 경로:
      - 정상 흐름  : node_generate → guardrail_output(OK) → save_history
      - 출력 차단  : node_generate → guardrail_output(BLOCKED) → save_history
      - 입력 차단  : guardrail_input(BLOCKED) → save_history (messages에 user 메시지 1개)

    BLOCKED 시 AI 내용은 실제 응답 대신 고정 차단 메시지를 저장한다.
    """
    import logging
    from app.hj.core.database import get_pool

    messages    = list(state["messages"])
    is_blocked  = state.get("system_status") == "BLOCKED"
    user_id     = state["user_id"]
    sess_id     = state["session_id"]
    tk_use_cnt  = state.get("tk_use_cnt", 0)
    now         = datetime.now()

    # ── 저장할 내용 결정 ─────────────────────────────────────────────────────
    # 사용자 메시지: 메시지가 2개 이상이면 끝에서 두 번째, 아니면 마지막(입력차단 시)
    user_content = getattr(
        messages[-2] if len(messages) >= 2 else messages[-1],
        "content", "",
    )

    if is_blocked:
        # BLOCKED: 고정 차단 메시지 저장, 가드레일 정보 포함
        grdl_yn    = "Y"
        grdl_cd    = state.get("grdl_cd")
        ai_content = BLOCK_MESSAGES.get(state.get("grdl_se", ""), DEFAULT_BLOCK)
    else:
        # 정상: 실제 AI 응답 저장
        grdl_yn    = "N"
        grdl_cd    = None
        ai_content = getattr(messages[-1], "content", "") if messages else ""

    # ── DB 저장 ──────────────────────────────────────────────────────────────
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT COALESCE(MAX(chat_sn), 0) AS max_sn FROM int_chat_history "
                "WHERE user_id = $1 AND sess_id = $2",
                user_id, sess_id,
            )
            next_sn = (row["max_sn"] or 0) + 1

            # 사용자 메시지 (chat_se = 'U') — 가드레일 정보는 항상 N/NULL
            await conn.execute(
                """
                INSERT INTO int_chat_history
                  (user_id, sess_id, chat_sn, chat_se, chat_desc,
                   grdl_yn, grdl_cd, tk_use_cnt, chat_dt, del_yn,
                   crt_at, crt_by, crt_ip, upd_at, upd_by, upd_ip)
                VALUES ($1,$2,$3,'U',$4,'N',NULL,0,$5,'N',$5,$1,'127.0.0.1',$5,$1,'127.0.0.1')
                """,
                user_id, sess_id, next_sn, user_content, now,
            )

            # AI 응답 (chat_se = 'A') — BLOCKED 시 grdl_yn='Y', 고정 차단 메시지
            await conn.execute(
                """
                INSERT INTO int_chat_history
                  (user_id, sess_id, chat_sn, chat_se, chat_desc,
                   grdl_yn, grdl_cd, tk_use_cnt, chat_dt, del_yn,
                   crt_at, crt_by, crt_ip, upd_at, upd_by, upd_ip)
                VALUES ($1,$2,$3,'A',$4,$5,$6,$7,$8,'N',$8,$1,'127.0.0.1',$8,$1,'127.0.0.1')
                """,
                user_id, sess_id, next_sn + 1,
                ai_content, grdl_yn, grdl_cd, tk_use_cnt, now,
            )
    except Exception as e:
        logging.getLogger(__name__).error(f"int_chat_history 저장 실패: {e}")

    return Command(goto=END)


# ── 그래프 조립 ──────────────────────────────────────────────────────────────

async def build_graph():
    """
    MemorySaver를 사용해 그래프를 빌드한다.
    interrupt/resume 상태는 프로세스 메모리에 저장 — 서버 재시작 시 초기화.
    """
    checkpointer = MemorySaver()

    g = StateGraph(GraphState)

    g.add_node("guardrail_input",     node_guardrail_input)
    g.add_node("classify",            node_classify)
    g.add_node("route",               node_route)
    g.add_node("node_enrich_context", node_enrich_context)
    g.add_node("node_human",          node_human)
    g.add_node("node_search",         node_search)
    g.add_node("node_excu_preflight",     node_excu_preflight)
    g.add_node("node_excu_preflight_ask", node_excu_preflight_ask)
    g.add_node("node_excu",               node_excu)
    g.add_node("node_excu_confirm",   node_excu_confirm)
    g.add_node("node_general",        node_general)
    g.add_node("node_generate",       node_generate)
    g.add_node("save_history",        node_save_history)
    g.add_node("guardrail_output",    node_guardrail_output)

    # 진입점만 선언 — 이후 라우팅은 모두 Command(goto=...)
    g.add_edge(START, "guardrail_input")

    return g.compile(checkpointer=checkpointer)


# 그래프 인스턴스 — 비동기 초기화가 필요하므로 chat.py에서 lifespan으로 초기화
graph = None
