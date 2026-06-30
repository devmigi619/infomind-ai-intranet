import json
from datetime import datetime

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

from app.hj.core.llm import get_llm, get_slm, get_structured_slm, count_tokens, uses_openai_client, get_sql_slm
from app.hj.models.state import GraphState
from app.hj.models.intent import IntentResult, PreflightResult, ReactDecisionResult
from app.hj.services.guardrail import check_guardrail
from app.hj.services.prompt import (
    INTENT_SYSTEM_PROMPT,
    HUMAN_CLARIFY_PROMPT,
    EXCU_PREVIEW_PROMPT,
    GENERATE_SYSTEM_PROMPT,
    PREFLIGHT_SYSTEM_PROMPT,
    REACT_DECISION_PROMPT,
)
from app.hj.services.schema import get_schema_for_intent, get_preflight_fields
from app.hj.services.tools import parse_llm_json

llm = get_llm(streaming=True)
slm = get_slm(streaming=True)

BLOCK_MESSAGES = {
    "A": "개인정보 보호를 위해 해당 내용에 답변드리기 어렵습니다.",
    "B": "부적절한 표현이 감지되어 답변을 드리기 어렵습니다.",
}
DEFAULT_BLOCK = "요청하신 내용에 답변드리기 어렵습니다."


def _recent_messages(state: GraphState, n: int) -> list:
    """state["messages"]에서 최근 n개만 반환 — 슬라이딩 윈도우."""
    return list(state["messages"])[-n:]


# ── 가드레일 노드 ────────────────────────────────────────────────────────────

async def node_guardrail_input(state: GraphState) -> Command:
    """사용자 입력 가드레일 — 차단 시 save_history로 라우팅 (GRDL 저장 후 종료)"""
    user_text = state["messages"][-1].content
    try:
        hit = await check_guardrail(user_text)
    except Exception as e:
        # embed 서버 장애 시 fail-open: 가드레일 우회하고 정상 흐름 진행
        print(f"[GUARDRAIL] 가드레일 검사 실패 (fail-open): {e}")
        hit = None
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
    try:
        hit = await check_guardrail(ai_text)
    except Exception as e:
        print(f"[GUARDRAIL] 출력 가드레일 검사 실패 (fail-open): {e}")
        hit = None
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
    """인텐트 + action_type 분류 — 최근 4개 메시지만 사용 (슬라이딩 윈도우)"""
    structured = get_structured_slm(IntentResult)
    messages = [SystemMessage(content=INTENT_SYSTEM_PROMPT)] + _recent_messages(state, 4)

    try:
        response = await structured.ainvoke(messages)
        if uses_openai_client():
            result = response          # OpenAI 호환(dev/llama): Pydantic 모델 직접 반환
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
        "search":  "node_enrich_context",   # 날짜·참조 보강 → node_react_gather
        "excu":    "node_enrich_context",   # 날짜·참조 보강 → node_react_gather
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
      search / excu 모두 → node_react_gather (ReAct 루프)
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
                f"[요청 시퀀스] 신규 {cfg['pk_sn_col']}={pending_req_sn} "
                f"(신규 INSERT 시에만 사용. 기존 데이터 수정 시에는 조회된 기존 값을 사용할 것)"
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

    next_node = "node_react_gather"   # search·excu 모두 ReAct 루프로 통일
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
    messages = [SystemMessage(content=HUMAN_CLARIFY_PROMPT)] + _recent_messages(state, 4)
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

    # 직전 대화 히스토리 (현재 메시지 제외 최근 6개) — "그냥 취소해줘"처럼 맥락이 필요한 발화 대응
    recent = list(state["messages"])[:-1][-6:]
    if recent:
        history_lines = []
        for m in recent:
            role = "사용자" if getattr(m, "type", "") == "human" else "AI"
            raw = getattr(m, "content", "")
            if isinstance(raw, list):   # content-list 포맷 방어
                raw = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in raw)
            history_lines.append(f"[{role}] {str(raw)[:200]}")
        human_content = (
            f"intent={intent}, user_id={state['user_id']}\n"
            "[직전 대화]\n" + "\n".join(history_lines) + f"\n질문: {user_message}"
        )
    else:
        human_content = f"intent={intent}, user_id={state['user_id']}\n질문: {user_message}"

    if date_ref := state.get("date_reference"):
        human_content += f"\n\n{date_ref}"
    if context:
        human_content += f"\n\n[추가 컨텍스트]\n{context}"

    llm_pf = get_sql_slm(PreflightResult)
    response = await llm_pf.ainvoke([
        SystemMessage(content=preflight_prompt),
        HumanMessage(content=human_content),
    ])
    try:
        result = response if uses_openai_client() else parse_llm_json(response.content, PreflightResult)
    except Exception:
        return Command(
            goto="save_history",
            update={"messages": [AIMessage("죄송합니다. 서버 오류로 인해 답변드리기 어렵습니다.")]},
        )

    # ── artifact 필드 보존 (ai_context/자비스패널용) ──────────────────────────
    # 이번 호출에서 추출된 값이 있으면 갱신, 없으면 이전 턴 값 유지
    pending_artifact = result.extracted or state.get("pending_artifact")

    # ── 라우팅 결정 ──────────────────────────────────────────────────────────
    # 0순위: 비즈니스 제약으로 실행 불가 — 즉시 최종 응답으로 종료
    # (예: 작성기간 종료, 이미 결재완료 건 수정 요청 — DB 조회 결과로 확인된 경우만)
    if result.infeasible and result.infeasible_reason:
        print(f"[PREFLIGHT] 비즈니스 제약으로 실행 불가 → 즉시 응답: {result.infeasible_reason}")
        return Command(
            goto="guardrail_output",
            update={
                "messages":                   [AIMessage(content=result.infeasible_reason)],
                "pending_preflight_question": None,
            },
        )

    if result.is_complete:
        return Command(goto="node_excu", update={
            "preflight_retry": 0,
            "pending_preflight_question": None,
            "pending_artifact": pending_artifact,
        })

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
        update={
            "pending_preflight_question": question,
            "pending_artifact": pending_artifact,
        },
    )


async def node_react_gather_ask(state: GraphState) -> Command:
    """
    node_react_gather 추가 정보 요청 전담 노드 — interrupt() 분리.

    [분리 이유]
    interrupt()를 node_react_gather 내부에서 호출하면, resume 시 해당 노드 전체(ReAct 루프
    포함)가 재실행된다. 전용 노드로 분리하면 resume 시 이 노드만 재실행되므로 불필요한
    LLM 호출(최대 5회)을 방지할 수 있다.

    라우팅:
      excu  → node_excu_preflight  (context 보존, Q&A 추가)
      search → node_react_gather   (re-query 필요: 사용자 답변을 반영해 DB 재조회)
    """
    question    = state.get("pending_react_question") or ""
    action_type = state.get("action_type") or "general"
    context     = state.get("context") or ""

    # ── 사용자 답변 수집 (interrupt) ─────────────────────────────────────────
    user_answer = interrupt({"type": "human", "question": question})

    # ── 취소 키워드 감지 ──────────────────────────────────────────────────────
    _CANCEL_KEYWORDS = {"취소", "cancel", "아니요", "아니오", "그만", "stop"}
    if str(user_answer).strip().lower() in _CANCEL_KEYWORDS:
        return Command(
            goto="save_history",
            update={"messages": [AIMessage("요청이 취소되었습니다.")]},
        )

    # ── Q&A를 context에 누적 ──────────────────────────────────────────────────
    qa_entry    = f"[추가 정보]\nQ: {question}\nA: {user_answer}"
    new_context = f"{context}\n{qa_entry}".strip() if context else qa_entry

    if action_type == "excu":
        # excu: context 보존한 채 preflight로 직행 (ReAct 재실행 불필요)
        # node_excu_preflight가 Q&A가 추가된 context로 충분성 재검증
        return Command(
            goto="node_excu_preflight",
            update={
                "context":               new_context,
                "messages":              [HumanMessage(content=str(user_answer))],
                "pending_react_question": None,
            },
        )
    else:
        # search: 사용자 답변을 반영해 DB를 다시 조회해야 하므로 node_react_gather 재진입
        # context 보존 + 사용자 답변을 대화 이력에 추가
        return Command(
            goto="node_react_gather",
            update={
                "context":               new_context,
                "messages":              [AIMessage(content=question), HumanMessage(content=str(user_answer))],
                "pending_react_question": None,
            },
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
        + _recent_messages(state, 4)
        + [HumanMessage(content=str(user_answer))]
    )
    recheck_resp = await slm_recheck.ainvoke(recheck_msgs)
    try:
        recheck = recheck_resp if uses_openai_client() else parse_llm_json(recheck_resp.content, IntentResult)
        if recheck.intent != intent or recheck.action_type != state.get("action_type"):
            return Command(
                goto="route",   # 그래프 등록명: g.add_node("route", node_route)
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


async def node_react_gather(state: GraphState) -> Command:
    """
    ReAct 루프 — SELECT 도구를 반복 실행해 컨텍스트를 동적으로 수집한다.

    search : 여러 SELECT → context 축적 → node_generate
    excu   : 추가 컨텍스트 확보 → node_excu_preflight

    루프는 Python 레벨에서 실행(LangGraph sub-graph 미사용).
    MemorySaver checkpoint와 충돌하지 않도록 루프 전체가 단일 노드 실행으로 처리된다.

    벡터 검색(VECTOR_SEARCH_INTENTS)은 별도 실행 후 context에 병합한다.

    탈출 조건:
      1) LLM이 tool_calls 없는 응답 반환 (자발적 종료)
      2) MAX_ITER(5회) 초과
    """
    import asyncio
    import time
    from langchain_core.messages import ToolMessage as _ToolMessage
    from langchain_core.callbacks.manager import adispatch_custom_event
    from app.hj.core.config import settings
    from app.hj.core.llm import is_dev, is_llama
    from app.hj.services.tools import execute_select_tool, execute_cypher_tool, execute_vector_sql, VECTOR_SEARCH_SQL, VECTOR_SEARCH_INTENTS
    from app.hj.services.graph_schema import get_graph_schema, GRAPH_RAG_INTENTS

    _node_t0 = time.perf_counter()

    action_type = state.get("action_type") or "general"
    intent      = state.get("intent") or "general"
    user_id     = state["user_id"]
    user_msg    = state["messages"][-1].content
    schema      = get_schema_for_intent(intent, mode="lookup")   # 조회 루프용 경량 스키마
    context     = state.get("context") or ""
    date_ref    = state.get("date_reference") or ""

    # ── 조회 백엔드 선택 (상호배타) ────────────────────────────────────────────
    # search(순수 조회) + Neo4j 적재 도메인(veh/mtgr/leave) → Cypher 전용(GDB 추론).
    # 그 외(excu 쓰기 전 수집, 미적재 도메인) → 기존 SQL 경로 유지.
    use_graph = (
        settings.graph_rag_enabled
        and action_type == "search"
        and intent in GRAPH_RAG_INTENTS
    )
    if use_graph:
        tools_list = [execute_cypher_tool]
        tools_map = {"execute_cypher_tool": execute_cypher_tool}
    else:
        tools_list = [execute_select_tool]
        tools_map = {"execute_select_tool": execute_select_tool}
    # tool-calling 안정성을 위해 경량 모델(slm) 대신 기본 LLM 사용
    llm_with_tools = get_llm(streaming=False).bind_tools(tools_list)

    # ── cold-start 진단 로그 ──────────────────────────────────────────────────
    # react 루프는 get_llm(기본 모델)을 쓰고, 직전 node_classify는 get_structured_slm(경량 모델)을 쓴다.
    # 두 모델이 다르면 Ollama가 모델을 교체 적재(cold-start)하므로 첫 호출이 유독 느리다.
    # 아래 로그로 "모델명 + 호출별 소요시간"을 남겨 cold-start 여부를 판별한다.
    if is_llama():
        _react_model = _slm_model = settings.llama_cpp_model
    elif is_dev():
        _react_model = settings.openai_llm_model
        _slm_model   = settings.openai_slm_model
    else:
        _react_model = settings.llm_model
        _slm_model   = settings.slm_model
    print(
        f"[REACT] 진입 — intent={intent} action={action_type} | "
        f"react모델={_react_model} (분류모델={_slm_model}) | "
        f"스키마={len(schema)}자 컨텍스트={len(context)}자 "
        f"히스토리={len(state['messages'])}건"
    )

    if use_graph:
        _tool_guide = (
            "- 오직 execute_cypher_tool(Neo4j Cypher, 읽기 전용)만 사용하세요. SQL 도구는 제공되지 않습니다.\n"
            "  관계를 따라가는 멀티홉(결재선, 예약-차량/회의실 연결)과 상위개념 추론에 그래프를 활용하세요.\n"
            "  (쓰기 구문 CREATE/MERGE/DELETE/SET 등은 제공되지 않습니다)\n"
        )
    else:
        _tool_guide = "- SELECT 도구만 사용하세요. (INSERT/UPDATE/DELETE 도구는 제공되지 않습니다)\n"
    system_content = (
        "당신은 사내 DB에서 필요한 정보를 조회로 수집하는 **정보 수집 전용** 에이전트입니다.\n"
        "당신의 유일한 임무는 **다음 실행 단계가 올바른 처리를 할 수 있도록 필요한 정보를 수집하고 요약하는 것**입니다.\n"
        "정보가 충분히 모이면 도구 호출 없이 **수집한 사실만 요약**하세요.\n\n"
        "★★★ 절대 금지 규칙 ★★★\n"
        + _tool_guide
        + "- 절대로 '예약되었습니다', '등록 완료', '처리되었습니다', '삭제되었습니다' 등\n"
        "  실행/완료/변경을 뜻하는 표현을 사용하지 마세요.\n"
        "- '저는 조회만 해요', '저는 INSERT 권한이 없어요', '저는 실행할 수 없어요' 등\n"
        "  자신의 역할 제약을 사용자에게 언급하지 마세요. 사용자 요청의 실행은 별도 단계가 처리합니다.\n"
        "- 사용자 요청의 실행 가능 여부를 판단하거나 거절하지 마세요.\n"
        "  단, DB 조회로 **비즈니스 제약**(기간 종료, 이미 처리됨, 권한 없음 등)이 실제로 확인된 경우에는\n"
        "  그 사실을 명확히 보고하세요.\n"
        "- 조회 결과가 비어있으면(빈 배열 []) '해당 데이터가 없습니다'로만 보고하세요.\n"
        "- 최종 응답은 반드시 '~을 확인했습니다', '~건이 조회되었습니다' 등\n"
        "  **조회 사실 보고** 형태로만 작성하세요.\n\n"
        f"[현재 사용자 ID] {user_id}\n"
        "결재·휴가 등 본인 데이터 조회 시에만 WHERE 조건에 이 값을 사용하세요.\n"
        "마스터·코드 테이블(양식목록, 부서, 직급, 공통코드 등) 조회 시에는 user_id를 WHERE에 추가하지 마세요.\n\n"
        + (f"{get_graph_schema()}\n\n" if use_graph else f"[테이블 스키마]\n{schema}\n\n")
        + (f"[기존 컨텍스트]\n{context}\n\n" if context else "")
        + (date_ref or "")
    )

    loop_msgs: list = [
        SystemMessage(content=system_content),
        *_recent_messages(state, 6),   # 최근 6개 슬라이딩 윈도우 (마지막 = 현재 사용자 메시지)
    ]

    MAX_ITER = 5
    LOOP_TIMEOUT = 40   # 한 LLM 호출당 최대 대기(초) — 초과 시 수집분으로 진행
    for i in range(MAX_ITER):
        # 루프 진행 상태를 프론트에 알림 (단순 라벨)
        await adispatch_custom_event(
            "react_progress",
            {"detail_status": f"정보를 조회하고 있어요 ({i + 1}/{MAX_ITER})"},
        )
        _call_t0 = time.perf_counter()
        try:
            response = await asyncio.wait_for(
                llm_with_tools.ainvoke(loop_msgs), timeout=LOOP_TIMEOUT
            )
        except asyncio.TimeoutError:
            _elapsed = time.perf_counter() - _call_t0
            # ★ i==0(첫 호출)에서 타임아웃 = cold-start(모델 적재) 강력 의심
            tag = " ★첫호출(cold-start 의심)" if i == 0 else ""
            print(f"[REACT] LLM 호출 #{i + 1} 타임아웃 — {_elapsed:.1f}s 경과{tag}")
            break  # 타임아웃 — 지금까지 수집분으로 진행
        _elapsed = time.perf_counter() - _call_t0
        n_calls = len(response.tool_calls) if response.tool_calls else 0
        tag = " ★첫호출(이 시간에 모델 적재 포함)" if i == 0 else ""
        print(f"[REACT] LLM 호출 #{i + 1} 완료 — {_elapsed:.1f}s, tool_calls={n_calls}{tag}")
        loop_msgs.append(response)

        if not response.tool_calls:
            break  # LLM이 충분하다고 판단 → 루프 종료

        for tc in response.tool_calls:
            _tool_t0 = time.perf_counter()
            result = await tools_map[tc["name"]].ainvoke(tc["args"])
            _tool_el = time.perf_counter() - _tool_t0
            print(f"[REACT]   tool {tc['name']} 실행 — {_tool_el:.2f}s")
            loop_msgs.append(
                _ToolMessage(content=str(result), tool_call_id=tc["id"], name=tc["name"])
            )

    # ── 수집 결과를 context에 병합 ────────────────────────────────────────────
    # ① 루프 최종 AI 메시지(도구 호출 없는 응답) = 에이전트의 해석/결론.
    #    이게 유실되면 다음 노드(preflight/generate)가 원시 JSON만 보고 맥락을 잃는다.
    #    분량은 한 단락 수준이라 프롬프트 부담이 거의 없다.
    # ② ToolMessage 원시 결과 = req_sn 등 구체값(node_excu의 UPDATE WHERE에 필요).
    final_ai = ""
    for m in reversed(loop_msgs):
        if isinstance(m, AIMessage) and not getattr(m, "tool_calls", None):
            c = m.content
            if isinstance(c, list):   # content-list 포맷 방어
                c = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in c)
            final_ai = str(c).strip()
            break

    tool_results = [m.content for m in loop_msgs if isinstance(m, _ToolMessage)]

    parts: list[str] = []
    if final_ai:
        parts.append(f"[조회 분석]\n{final_ai}")
    if tool_results:
        parts.append("[동적 조회 결과]\n" + "\n".join(tool_results))

    if parts:
        gathered = "\n\n".join(parts)
        new_context = f"{context}\n\n{gathered}".strip() if context else gathered
    else:
        new_context = context  # 도구·응답 모두 없으면 기존 컨텍스트 유지

    # ── 벡터 검색 (search + VECTOR_SEARCH_INTENTS일 때만) ────────────────────
    vector_sql_logged = None
    if action_type == "search" and intent in VECTOR_SEARCH_INTENTS:
        user_embedding = state.get("user_embedding")
        if user_embedding:
            try:
                vector_rows = await execute_vector_sql(VECTOR_SEARCH_SQL, user_embedding)
                if vector_rows:
                    new_context += (
                        "\n\n[첨부파일 내용 검색 결과 — 사용자 질문과 관련 있는 경우에만 참고하고, 무관하면 무시할 것]\n"
                        + json.dumps(vector_rows, ensure_ascii=False, default=str)
                    )
                    vector_sql_logged = VECTOR_SEARCH_SQL
            except Exception:
                pass  # 벡터 검색 실패 시 무시

    # ── excu: 의사결정 LLM 생략 — preflight가 충족성·실행가능성 판단 전담 ────
    # 정보 부족 질문은 node_excu_preflight(is_complete=false → ask)가,
    # 비즈니스 제약 차단(작성기간 종료 등)은 preflight의 infeasible 판정이 처리한다.
    # → 이중 질문 문제 해소 + LLM 호출 1회 절감.
    if action_type != "search":
        _node_el = time.perf_counter() - _node_t0
        print(f"[REACT] 종료 — 노드 총 {_node_el:.1f}s, 수집 {len(tool_results)}건 → node_excu_preflight (decision 생략)")
        return Command(
            goto="node_excu_preflight",
            update={
                "context":    new_context,
                "vector_sql": vector_sql_logged,
            },
        )

    # ── search: 추가 정보 요구 및 직접 응답 가능 여부 판단 (LLM) ──────────────
    decision_slm = get_structured_slm(ReactDecisionResult).with_config(tags=["react_decision"])
    decision_messages = [
        SystemMessage(content=REACT_DECISION_PROMPT),
        SystemMessage(content=f"[현재 action_type] {action_type}"),
        SystemMessage(content=f"[수집된 컨텍스트]\n{new_context}"),
        *_recent_messages(state, 6),
    ]

    try:
        decision_resp = await decision_slm.ainvoke(decision_messages)
        if uses_openai_client():
            decision = decision_resp
        else:
            decision = parse_llm_json(decision_resp.content, ReactDecisionResult)
    except Exception as e:
        print(f"[REACT] 의사결정 LLM 호출 실패로 기존 흐름 폴백: {e}")
        decision = ReactDecisionResult(need_more_info=False, proceed_to_next_node=True)



    # A. 추가 정보 요구 (need_more_info == True)
    # interrupt()를 이 노드 내부에서 직접 호출하지 않고 전용 노드(node_react_gather_ask)로 위임.
    # → resume 시 node_react_gather 전체(ReAct 루프 포함)가 재실행되는 비용 문제 해결.
    if decision.need_more_info and decision.more_info_question:
        print(f"[REACT] 추가 정보 필요 → node_react_gather_ask 위임: {decision.more_info_question}")
        return Command(
            goto="node_react_gather_ask",
            update={
                "context":               new_context,   # 수집된 context 보존 (소실 방지)
                "pending_react_question": decision.more_info_question,
            },
        )

    # B. 다음 노드 진행 불필요 (proceed_to_next_node == False)
    # excu에서도 비즈니스 제약(기간 종료, 권한 없음 등)이 확인된 경우 여기서 종료할 수 있다.
    # 단, 프롬프트에서 "조회 에이전트의 역할 제약"은 proceed=False 사유가 아님을 명시해야 한다.
    if not decision.proceed_to_next_node and decision.direct_response:
        print(f"[REACT] 다음 노드 진행 불필요 → 즉시 최종 응답")
        return Command(
            goto="guardrail_output",
            update={
                "messages": [AIMessage(content=decision.direct_response)],
                "context":  new_context,
            },
        )

    # C. 기존 로직대로 진행 (proceed_to_next_node == True, 또는 excu 항상)
    _node_el = time.perf_counter() - _node_t0
    print(f"[REACT] 종료 — 노드 총 {_node_el:.1f}s, 수집 {len(tool_results)}건 → {('node_generate' if action_type == 'search' else 'node_excu_preflight')}")

    next_node = "node_generate" if action_type == "search" else "node_excu_preflight"
    return Command(
        goto=next_node,
        update={
            "context":    new_context,
            "vector_sql": vector_sql_logged,
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

    # 직전 대화 히스토리 (현재 메시지 제외 최근 6개)
    # "응", "네" 등 단답형 응답 시 SQL 생성 LLM이 INSERT/UPDATE 의도를 판단할 맥락 제공
    recent = list(state["messages"])[:-1][-6:]
    history_text = ""
    if recent:
        lines = []
        for m in recent:
            role = "사용자" if getattr(m, "type", "") == "human" else "AI"
            raw = getattr(m, "content", "")
            if isinstance(raw, list):
                raw = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in raw)
            lines.append(f"[{role}] {str(raw)[:200]}")
        history_text = "\n".join(lines)

    # DML SQL 생성 (SqlResult 구조체) — EXPLAIN 검증 실패 시 오류를 붙여 1회 재생성
    from app.hj.services.tools import validate_sql_explain

    sql = ""
    gen_ctx = ctx
    for attempt in range(2):
        sql_result = await generate_sql(
            intent=intent,
            action_type="excu",
            user_message=user_message,
            user_id=user_id,
            context=gen_ctx,
            date_reference=state.get("date_reference") or "",
            conversation_history=history_text,
        )
        sql = sql_result.sql

        # 실행 불가 판정 (핵심 정보 여전히 미확보)
        if not sql_result.is_executable:
            missing_str = ", ".join(sql_result.missing_info) if sql_result.missing_info else "알 수 없음"
            return Command(
                goto="node_generate",
                update={"context": f"필요한 정보가 부족해 실행할 수 없습니다. 누락 정보: {missing_str}"},
            )

        # EXPLAIN 사전 검증 — 플래너 통과 여부 확인 (실제 실행 없음)
        sql_error = await validate_sql_explain(sql)
        if sql_error is None:
            break
        print(f"[EXCU] SQL EXPLAIN 검증 실패 (시도 {attempt + 1}/2): {sql_error}")
        if attempt == 0:
            # 오류 메시지를 컨텍스트에 붙여 재생성 1회
            gen_ctx = (
                f"{ctx}\n\n[이전 생성 SQL — PostgreSQL 검증 실패. 아래 오류를 수정해 다시 생성할 것]\n"
                f"SQL: {sql}\n오류: {sql_error}"
            )
        else:
            # 재생성도 실패 — 실행하지 않고 안내로 종료
            return Command(
                goto="node_generate",
                update={"context": f"요청을 처리할 SQL 생성에 실패했습니다. (검증 오류: {sql_error})"},
            )

    # 자연어 미리보기 생성 (SQL 직접 노출 없이)
    preview_messages = [
        SystemMessage(content=EXCU_PREVIEW_PROMPT),
        *_recent_messages(state, 4),
        SystemMessage(content=f"[생성된 실행 내용]\n{sql}"),
    ]
    preview_response = await slm.ainvoke(preview_messages)
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


# ── 폼 interrupt 대상 intent 매핑 ────────────────────────────────────────────
# INSERT/UPDATE 동작에서 사용자가 직접 입력해야 하는 필드가 있는 intent.
# interrupt_payload의 type을 'excu' 대신 'form'으로 바꾸고 form_fields를 포함시킨다.
# value 키: node_excu_confirm에서 context 파싱 후 기존 값으로 채워진다 (초기값 pre-load).
_FORM_INTERRUPT_INTENTS: dict[str, dict] = {
    "rpt": {
        "title": "업무보고",
        "fields": [
            {
                "key": "exec_desc",
                "label": "수행 업무",
                "type": "textarea",
                "required": True,
                "placeholder": "이번 기간에 수행한 업무를 작성하세요",
            },
            {
                "key": "plan_desc",
                "label": "계획 업무",
                "type": "textarea",
                "required": True,
                "placeholder": "다음 기간에 계획된 업무를 작성하세요",
            },
            {
                "key": "sbmt_yn",
                "label": "제출 여부",
                "type": "select",
                "required": False,
                "options": [
                    {"label": "임시저장", "value": "N"},
                    {"label": "제출완료", "value": "Y"},
                ],
            },
        ],
    },
}


def _extract_context_values(context: str, keys: list[str]) -> dict[str, str]:
    """
    context 문자열에서 JSON 배열을 파싱해 keys에 해당하는 값을 추출한다.
    여러 JSON 배열에 걸쳐 있어도 마지막에 발견된 값으로 병합한다.

    다른 intent의 form pre-load에도 공통으로 사용할 수 있도록 독립 함수로 분리.
    """
    import re as _re, json as _json

    found: dict[str, str] = {}
    for m in _re.finditer(r'\[[\s\S]*?\]', context):
        try:
            arr = _json.loads(m.group())
            if not isinstance(arr, list):
                continue
            for rec in arr:
                if not isinstance(rec, dict):
                    continue
                for k in keys:
                    if k in rec and rec[k] is not None:
                        found[k] = str(rec[k])
        except Exception:
            pass
    return found


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

    폼 처리 (_FORM_INTERRUPT_INTENTS):
      - INSERT이고 해당 intent가 _FORM_INTERRUPT_INTENTS에 있으면 type='form'으로 전환
      - resume_value: JSON {"decision":"승인","form_data":{"exec_desc":"...","plan_desc":"..."}}
      - 승인 시: patch_form_values()로 SQL NULL 값을 form_data로 교체 후 실행
    """
    from app.hj.services.tools import (
        APRVL_LINE_INTENTS, build_aprvl_insert_sqls, execute_sql_transaction,
        check_any_approved,
    )

    sql          = state.get("generated_sql") or ""
    preview_text = state.get("pending_excu_preview") or "실행 내용을 확인해 주세요."
    user_id      = state["user_id"]
    intent       = state.get("intent") or ""

    # ── SQL 종류 판별 ─────────────────────────────────────────────────────────
    is_insert = sql.strip().upper().startswith("INSERT")

    # ── DELETE/UPDATE 전 승인 상태 검증 ──────────────────────────────────────
    # 결재선 대상 intent이고 INSERT가 아니면, 이미 진행된 건인지 사전 확인
    if not is_insert and intent in APRVL_LINE_INTENTS:
        already_approved = await check_any_approved(intent, sql, user_id)
        if already_approved:
            return Command(
                goto="save_history",
                update={
                    "messages":             [AIMessage(content="이미 결재가 진행된 건은 수정 또는 삭제할 수 없습니다.")],
                    "pending_excu_preview": None,
                    "pending_aprvl_list":   None,
                    "pending_ref_list":     None,
                    "pending_req_sn":       None,
                },
            )

    # ── interrupt 페이로드 구성 ────────────────────────────────────────────────
    aprvl_list_state = state.get("pending_aprvl_list")
    ref_list_state   = state.get("pending_ref_list")

    # INSERT/UPDATE 모두 _FORM_INTERRUPT_INTENTS 대상이면 폼 interrupt로 전환
    # (기존 데이터 pre-load + sbmt_yn 선택 포함)
    form_cfg = _FORM_INTERRUPT_INTENTS.get(intent)

    if form_cfg:
        # context에서 기존 값을 추출해 form_fields에 pre-load (INSERT/UPDATE 공통)
        field_keys = [f["key"] for f in form_cfg["fields"]]
        existing   = _extract_context_values(state.get("context") or "", field_keys)
        fields_with_values = [
            {**f, "value": existing[f["key"]]} if f["key"] in existing else f
            for f in form_cfg["fields"]
        ]

        interrupt_payload: dict = {
            "type":        "form",
            "preview":     preview_text,
            "form_title":  form_cfg["title"],
            "form_fields": fields_with_values,
        }
    else:
        interrupt_payload = {"type": "excu", "preview": preview_text}
        if is_insert and aprvl_list_state is not None:    # INSERT일 때만 결재선 모달 포함
            interrupt_payload["aprvl_list"] = aprvl_list_state
            interrupt_payload["ref_list"]   = ref_list_state or []

    # 사용자 승인 대기 — SSE에서 on_interrupt 이벤트로 프론트에 전달
    user_decision = interrupt(interrupt_payload)

    # ── resume_value 파싱 ─────────────────────────────────────────────────────
    # JSON 구조체 (form):  {"decision":"승인","form_data":{"exec_desc":"...","plan_desc":"..."}}
    # JSON 구조체 (excu):  {"decision":"승인","aprvl_list":[...],"ref_list":[...]}
    # 단순 문자열:          "승인" / "취소" (일반 excu 또는 구버전 프론트)
    try:
        parsed     = json.loads(user_decision)
        decision   = parsed.get("decision", "")
        aprvl_list = parsed.get("aprvl_list", aprvl_list_state or [])
        ref_list   = parsed.get("ref_list",   ref_list_state   or [])
        form_data  = parsed.get("form_data",  {}) if form_cfg else {}
    except (json.JSONDecodeError, TypeError):
        decision   = str(user_decision)
        aprvl_list = aprvl_list_state or []
        ref_list   = ref_list_state   or []
        form_data  = {}

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

    # ── 승인: 폼 데이터 주입 (form interrupt인 경우) ──────────────────────────
    if form_data:
        from app.hj.services.tools import patch_form_values
        sql = patch_form_values(sql, form_data)

    # ── 승인: 메인 SQL + 결재선 INSERT를 단일 트랜잭션으로 실행 ─────────────────
    try:
        main_sqls  = [sql]
        aprvl_sqls: list[str] = []

        req_sn = state.get("pending_req_sn")
        if is_insert and intent in APRVL_LINE_INTENTS and req_sn is not None:
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

    # ── 자비스패널 인지 주입 — 2채널은 한 화자 ────────────────────────────────
    # AI가 자기 패널(사물 채널)에 띄운 내용을 알아야 중복 답변 대신 참조할 수 있다.
    from app.hj.services.ai_context import describe_session_context
    panel_desc = describe_session_context(state.get("session_id") or "")
    if panel_desc:
        full_context += (
            f"\n\n[자비스패널 표시 중]\n{panel_desc}\n"
            "(위 내용이 사용자 화면 우측 패널에 이미 표시되어 있다. "
            "관련 질문이면 다시 나열하지 말고 패널을 참조하도록 안내하라.)"
        )

    system_msg = f"{GENERATE_SYSTEM_PROMPT}\n\n[컨텍스트]\n{full_context}\n====추가내용====\n[intent]\n{intent}\n[action_type]\n{action_type}"

    messages = [SystemMessage(content=system_msg)] + _recent_messages(state, 4)
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
    g.add_node("node_react_gather",     node_react_gather)
    g.add_node("node_react_gather_ask", node_react_gather_ask)
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
