import asyncio
import json
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langgraph.types import Command

from app.hj.core.auth import verify_token
from app.hj.core.config import settings
from app.hj.services import graph as graph_module
from app.hj.services import ai_context as ai_ctx
from app.hj.services.graph import BLOCK_MESSAGES, DEFAULT_BLOCK, build_graph
from app.hj.models.state import GraphState

router = APIRouter()

_graph_lock = asyncio.Lock()


async def _get_graph():
    """graph를 lazy init으로 반환 (database.py의 get_pool 패턴과 동일)"""
    if graph_module.graph is None:
        async with _graph_lock:
            if graph_module.graph is None:
                graph_module.graph = await build_graph()
    return graph_module.graph


def _extract_update(output) -> dict:
    """
    on_chain_end 이벤트의 output은 노드가 Command를 반환할 경우 Command 객체.
    상태 업데이트 dict를 안전하게 추출한다.
    """
    if isinstance(output, Command):
        return output.update or {}
    if isinstance(output, dict):
        return output
    return {}


def _build_meta_event(payload: dict) -> str:
    """SSE meta 이벤트를 구성한다."""
    data = {
        "type": "meta",
        "ai_context_enabled": settings.ai_context_enabled,
        **payload,
    }
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _build_ai_context_event(g, config, *, submit_enabled: bool) -> str | None:
    """
    ai_context(자비스패널) SSE 이벤트 생성.

    interrupt 시점에 호출: 체크포인트에서 pending_artifact·결재선을 읽어
    artifact 포함 스냅샷을 만든다. 실패해도 채팅 스트림을 깨지 않도록 None 반환.
    """
    if not settings.ai_context_enabled:
        return None

    try:
        snap = await g.aget_state(config)
        vals = snap.values if snap else {}
        intent = vals.get("intent")
        if not ai_ctx.supports_domain(intent):
            return None
        payload = await ai_ctx.build_payload(
            domain=intent,
            operation=ai_ctx.infer_operation(vals.get("generated_sql")),
            session_id=vals.get("session_id") or "",
            user_id=vals.get("user_id") or "",
            pending_artifact=vals.get("pending_artifact"),
            submit_enabled=submit_enabled,
            aprvl_list=vals.get("pending_aprvl_list"),
        )
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
    except Exception:
        return None


def _build_interrupt_event(interrupt_type: str, interrupt_value: dict) -> str:
    """
    interrupt SSE 이벤트를 구성한다.

    - human: node_human 은 question 텍스트를 이미 스트리밍했으므로 question 필드 선택적.
             node_excu_preflight 는 structured output 이라 토큰을 스트리밍하지 않으므로
             반드시 question 필드를 payload 에 포함해야 프론트가 질문을 표시할 수 있다.
    - excu:  preview 텍스트를 이미 스트리밍했으므로 preview 필드 선택적.
    """
    payload: dict = {"type": "interrupt", "interrupt_type": interrupt_type}

    if isinstance(interrupt_value, dict):
        if interrupt_type == "human":
            question = interrupt_value.get("question", "")
            if question:
                payload["question"] = question
        elif interrupt_type == "excu":
            preview = interrupt_value.get("preview", "")
            if preview:
                payload["preview"] = preview
            # 결재선 있는 intent일 때만 포함 (프론트가 키 존재 여부로 편집 UI 표시 결정)
            if (aprvl_list := interrupt_value.get("aprvl_list")) is not None:
                payload["aprvl_list"] = aprvl_list
                payload["ref_list"]   = interrupt_value.get("ref_list", [])
        elif interrupt_type == "form":
            # 미리보기 텍스트 (선택)
            preview = interrupt_value.get("preview", "")
            if preview:
                payload["preview"] = preview
            # 동적 폼 필드 목록
            form_fields = interrupt_value.get("form_fields")
            if form_fields:
                payload["form_fields"] = form_fields
            # 폼 제목 (없으면 프론트 기본값 '양식 작성' 사용)
            form_title = interrupt_value.get("form_title", "")
            if form_title:
                payload["form_title"] = form_title

    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


# ── 진행 상태(progress) 라벨 ──────────────────────────────────────────────────
# status        : 노드 이름 기반 coarse 라벨 (하위 호환 유지)
# detail_status : intent를 반영한 상세 라벨 — 프론트 누적 타임라인용
#   주의) 여기서 쓰는 status는 GraphState.system_status("OK"/"BLOCKED")와 무관하다.

_COARSE_STATUS: dict[str, str] = {
    "guardrail_input":     "요청 점검 중...",
    "classify":            "분석 중...",
    "node_enrich_context": "참조 정보 조회 중...",
    "node_excu_preflight":     "정보 확인 중...",
    "node_excu_preflight_ask": "추가 정보 대기 중...",
    "node_search":         "데이터 조회 중...",
    "node_excu":           "처리 내용 확인 중...",
    "node_excu_confirm":   "실행 대기 중...",
    "node_human":          "추가 정보 확인 중...",
    "node_generate":       "답변 생성 중...",
}

_INTENT_LABEL: dict[str, str] = {
    "leave": "휴가", "aprv": "전자결재", "brd": "게시판", "schd": "일정",
    "veh": "차량", "mtgr": "회의실", "rpt": "보고서", "general": "",
}


def _build_detail_status(name: str, node_input) -> str | None:
    """노드 이름 + (가능하면) intent를 반영한 상세 진행 라벨을 만든다.

    node_input은 on_chain_start 이벤트의 입력 state(dict)다.
    classify 이전 노드는 intent가 아직 없으므로 일반 문구로 폴백한다.
    """
    state = node_input if isinstance(node_input, dict) else {}
    label = _INTENT_LABEL.get(state.get("intent") or "", "")
    sp = f"{label} " if label else ""

    builders: dict[str, str] = {
        "guardrail_input":     "요청을 점검하고 있어요",
        "classify":            "요청 의도를 파악하고 있어요",
        "node_enrich_context": f"{sp}관련 정보를 모으고 있어요",
        "node_search":         f"{sp}내역을 조회하고 있어요",
        "node_excu_preflight":     f"{sp}신청에 필요한 정보를 확인하고 있어요",
        "node_excu_preflight_ask": f"{sp}추가 정보를 기다리고 있어요",
        "node_excu":               f"{sp}실행 내용을 작성하고 있어요",
        "node_excu_confirm":   "실행을 준비하고 있어요",
        "node_human":          "추가로 여쭤볼 내용을 정리하고 있어요",
        "node_generate":       "답변을 작성하고 있어요",
        "node_general":        "답변을 정리하고 있어요",
    }
    return builders.get(name)


async def _sse_stream(input_, config: dict, turn_id: str | None = None):
    """
    input_   : GraphState(최초 실행) 또는 Command(resume=...) (재개 실행)
    config   : {"configurable": {"thread_id": turn_id}}
    turn_id  : /chat 신규 요청 시 생성한 UUID — 프론트에 전달해 resume 시 재사용

    토큰 스트리밍 허용 노드: node_generate / node_human / node_excu(미리보기)
      - node_classify        : structured output(JSON) → 필터링
      - node_excu_preflight  : structured output(JSON) → 필터링
      - node_excu_confirm    : LLM 미사용, 고정 메시지를 on_chain_end로 방출
      - generate_sql(tools)  : 비스트리밍 LLM 사용 → on_chat_model_stream 미발생
    """
    g = await _get_graph()
    meta_sent = False
    is_resume = isinstance(input_, Command)

    # ai_context(자비스패널) — 턴 종결 시 방출 판단용 스트림 스코프 메타
    stream_intent: str | None = None
    stream_sess = (input_.get("session_id") or "") if isinstance(input_, dict) else ""
    stream_user = (input_.get("user_id") or "") if isinstance(input_, dict) else ""

    # turn_id 이벤트 — /chat 신규 요청 시 프론트에 전달
    # 프론트는 이 값을 저장해 /chat/resume 요청 시 turn_id 필드로 전송한다.
    if turn_id:
        yield f"data: {json.dumps({'type': 'turn_id', 'turn_id': turn_id})}\n\n"

    # 토큰을 프론트로 흘릴 노드 화이트리스트
    # resume 시: node_excu_confirm(interrupt+실행) 만 재실행된다.
    #   node_excu(SQL 생성+미리보기)는 재실행되지 않으므로 중복 스트리밍 없음.
    #   node_excu_confirm은 LLM을 호출하지 않으므로 STREAM_NODES 제어 불필요.
    #   node_human resume 시에도 node_generate 응답만 허용한다.
    STREAM_NODES = (
        {"node_generate"}
        if is_resume
        else {"node_generate", "node_human", "node_excu"}
    )

    async for event in g.astream_events(input_, config=config, version="v2"):
        kind = event["event"]
        name = event.get("name", "")

        # ── 노드 시작 → 진행 상태 이벤트 ────────────────────────────────────────
        if kind == "on_chain_start":
            coarse = _COARSE_STATUS.get(name)
            detail = _build_detail_status(name, event.get("data", {}).get("input"))
            if coarse or detail:
                payload = {"type": "progress"}
                if coarse:
                    payload["status"] = coarse          # 하위 호환
                if detail:
                    payload["detail_status"] = detail   # 누적 타임라인용
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        # ── 커스텀 진행 이벤트 (node_react_gather 루프) → progress SSE ──────────
        if kind == "on_custom_event" and name == "react_progress":
            data = event.get("data", {})
            detail = data.get("detail_status") if isinstance(data, dict) else None
            if detail:
                yield f"data: {json.dumps({'type': 'progress', 'detail_status': detail}, ensure_ascii=False)}\n\n"

        # ── 가드레일 차단 감지 ──────────────────────────────────────────────────
        if kind == "on_chain_end" and name in ("guardrail_input", "guardrail_output"):
            update = _extract_update(event["data"]["output"])
            if update.get("system_status") == "BLOCKED":
                grdl_se = update.get("grdl_se", "")
                msg = BLOCK_MESSAGES.get(grdl_se, DEFAULT_BLOCK)
                if not meta_sent:
                    yield _build_meta_event({"actions": []})
                yield f"data: {json.dumps({'type': 'token', 'content': msg})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        # ── node_general / node_excu_confirm / node_excu_preflight 완료 → 고정 메시지를 token으로 방출 ──
        # LLM 토큰 스트리밍 없이 고정 메시지를 messages에 담아 save_history로 직행하는 노드.
        # on_chain_end에서 messages를 꺼내 직접 token 이벤트로 전달한다.
        # node_excu_preflight: 파싱 오류 시 오류 메시지를 담아 save_history로 직행.
        # (node_excu는 SQL+미리보기 생성 후 node_excu_confirm으로 라우팅만 하므로 messages 없음)
        if kind == "on_chain_end" and name in ("node_general", "node_excu_confirm", "node_excu_preflight", "node_excu_preflight_ask", "node_react_gather"):
            update = _extract_update(event["data"]["output"])
            msgs = update.get("messages", [])
            if msgs:
                last = msgs[-1]
                from langchain_core.messages import AIMessage
                if isinstance(last, AIMessage):
                    content = last.content
                    if content:
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

        # ── ai_context — 실행 확정/취소 후 artifact 소멸 스냅샷 ────────────────
        # node_excu_confirm은 interrupt 후 resume에서만 정상 종료(on_chain_end)한다.
        # 성공("처리가 완료...") → 완료 fact 변환, 취소·오류 → 드래프트 폐기 후 ambient만.
        if kind == "on_chain_end" and name == "node_excu_confirm":
            state_in = event.get("data", {}).get("input") or {}
            if (
                settings.ai_context_enabled
                and ai_ctx.supports_domain(state_in.get("intent"))
                and (ctx_sess := state_in.get("session_id") or "")
            ):
                update = _extract_update(event["data"]["output"])
                _msgs = update.get("messages") or []
                _content = getattr(_msgs[-1], "content", "") if _msgs else ""
                _completed = str(_content).startswith("처리가 완료")
                try:
                    if not _completed:
                        ai_ctx.clear_session(ctx_sess)  # 취소·오류: 드래프트 폐기 (재부활 방지)
                    ctx_payload = await ai_ctx.build_payload(
                        domain=state_in.get("intent") or "",
                        operation=ai_ctx.infer_operation(state_in.get("generated_sql")),
                        session_id=ctx_sess,
                        user_id=state_in.get("user_id") or "",
                        completed=_completed,
                    )
                    yield f"data: {json.dumps(ctx_payload, ensure_ascii=False)}\n\n"
                except Exception:
                    pass  # 패널 이벤트 실패가 채팅 스트림을 깨지 않도록

        # ── classify 완료 → meta 이벤트 (+ 파싱 오류 시 오류 메시지) ────────────
        # 파싱 오류 시 classify가 messages를 담아 save_history로 직행하므로
        # meta 전송 후 곧바로 오류 token을 방출한다 (meta → token 순서 보장).
        if kind == "on_chain_end" and name == "classify" and not meta_sent:
            update = _extract_update(event["data"]["output"])
            actions = update.get("actions", [])
            intent = update.get("intent")
            action_type = update.get("action_type")
            yield _build_meta_event({
                "intent": intent,
                "action_type": action_type,
                "actions": actions,
            })
            meta_sent = True

            # ── ai_context(자비스패널) — 분류 시점엔 방출하지 않는다 ──────────
            # 패널은 '턴의 종결 형태'에 따라 방출한다 (설계 개정 2026-06-12):
            #   묻고 끝난 턴(human)=침묵 / 확인 준비(excu)=artifact / 답하고 끝남=스냅샷.
            # 여기서는 도메인 전환 소멸과 턴 메타 기록만 수행.
            state_in = event.get("data", {}).get("input") or {}
            stream_intent = intent
            stream_sess = state_in.get("session_id") or stream_sess
            stream_user = state_in.get("user_id") or stream_user
            if settings.ai_context_enabled and intent and stream_sess:
                ai_ctx.clear_on_domain_switch(stream_sess, intent)

            msgs = update.get("messages", [])
            if msgs:
                last = msgs[-1]
                content = last.content if hasattr(last, "content") else str(last)
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

        # ── interrupt 감지 ───────────────────────────────────────────────────────
        # node_human / node_excu     : question/preview 텍스트는 on_chat_model_stream
        #                              에서 이미 스트리밍됨. payload 의 question/preview
        #                              필드는 프론트가 참고용으로 사용.
        # node_excu_preflight        : structured output → 토큰 스트리밍 없음.
        #                              payload 의 question 필드가 프론트가 받는 유일한
        #                              질문 텍스트이므로 반드시 포함해야 한다.
        if kind == "on_interrupt":
            raw = event.get("data", {})
            interrupt_value = raw.get("value", raw)
            interrupt_type = (
                interrupt_value.get("type", "") if isinstance(interrupt_value, dict) else ""
            )

            if not meta_sent:
                yield _build_meta_event({"actions": []})
                meta_sent = True

            # ai_context — excu(확인 준비) interrupt에서만 artifact 스냅샷 방출.
            # human(묻는 중) interrupt는 침묵 — 패널이 촐랑대지 않는다 (설계 개정)
            if interrupt_type == "excu":
                if ctx_event := await _build_ai_context_event(
                    g, config, submit_enabled=True,
                ):
                    yield ctx_event

            if interrupt_type in ("human", "excu", "form"):
                yield _build_interrupt_event(interrupt_type, interrupt_value)

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return  # interrupt 후 스트림 종료 — 재개는 /chat/resume 요청으로 처리

        # ── LLM 토큰 스트리밍 ────────────────────────────────────────────────────
        # 허용 노드(STREAM_NODES)에서 발생한 on_chat_model_stream 만 전달.
        # generate_sql 은 "sql_generation" 태그로 마킹되어 있어 별도 필터링한다.
        #   - astream_events v2 는 streaming=False 와 무관하게 내부 LLM 토큰을 방출함
        #   - 태그 필터로 SQL JSON 토큰이 프론트로 노출되는 것을 차단
        if kind == "on_chat_model_stream":
            tags = event.get("tags", [])
            if "sql_generation" in tags or "react_decision" in tags:
                continue  # SQL JSON 토큰 및 의사결정 토큰 — 프론트 노출 차단
            langgraph_node = event.get("metadata", {}).get("langgraph_node", "")
            if langgraph_node in STREAM_NODES:
                token = event["data"]["chunk"].content
                if token:
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

    # ── astream_events 루프 종료 후 pending interrupt 감지 (fallback) ────────────
    # LangGraph 버전에 따라 on_interrupt 이벤트가 방출되지 않을 수 있으므로,
    # 루프 완료 후 aget_state() 로 체크포인트를 조회해 interrupt 상태를 확인한다.
    try:
        graph_state = await g.aget_state(config)
        if graph_state and graph_state.tasks:
            pending = [i for task in graph_state.tasks for i in task.interrupts]
            if pending:
                iv = pending[0].value
                it = iv.get("type", "") if isinstance(iv, dict) else ""
                if not meta_sent:
                    yield _build_meta_event({"actions": []})
                if it == "excu":
                    if ctx_event := await _build_ai_context_event(
                        g, config, submit_enabled=True,
                    ):
                        yield ctx_event
                if it in ("human", "excu", "form"):
                    yield _build_interrupt_event(it, iv)
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
    except Exception:
        pass  # fallback 실패 시 무시하고 일반 done 전송

    # ── ai_context — 답하고 정상 종결한 턴의 스냅샷 방출 ────────────────────────
    # (interrupt로 끝난 턴은 위에서 return — 여기 도달 = 묻지 않고 답한 턴)
    # 세션에 살아 있는 드래프트가 있으면 함께 실려 유지된다.
    if settings.ai_context_enabled and ai_ctx.supports_domain(stream_intent) and stream_sess:
        try:
            if ctx_event := await _build_ai_context_event(g, config, submit_enabled=False):
                yield ctx_event
        except Exception:
            pass  # 패널 이벤트 실패가 채팅 스트림을 깨지 않도록

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/chat")
async def chat(request: dict, user=Depends(verify_token)):
    """최초 요청 — 새 그래프 실행"""
    session_id = request.get("session_id", "") or str(user.get("sub", ""))
    # turn_id: 매 턴마다 새로 생성 — MemorySaver thread_id로 사용
    # session_id는 DB(int_chat_history.sess_id) 저장용으로만 유지
    turn_id = str(uuid4())
    config = {"configurable": {"thread_id": turn_id}}

    state: GraphState = {
        "messages": request.get("history", [])
                    + [{"role": "user", "content": request.get("message", "")}],
        "user_id":        str(user.get("sub", "")),
        "session_id":     session_id,
        "intent":         None,
        "action_type":    None,
        "context":        None,
        "date_reference": None,
        "generated_sql":        None,
        "pending_excu_preview": None,
        "pending_aprvl_list":   None,
        "pending_ref_list":     None,
        "pending_req_sn":       None,
        "user_embedding":       None,
        "vector_sql":     None,
        "actions":        [],
        "grdl_cd":        None,
        "grdl_se":        None,
        "grdl_nm":        None,
        "tk_use_cnt":     0,
        "system_status":             "OK",
        "preflight_retry":           0,
        "pending_preflight_question": None,
        "pending_artifact":          None,
    }
    return StreamingResponse(
        _sse_stream(state, config, turn_id=turn_id),
        media_type="text/event-stream",
    )


@router.post("/chat/resume")
async def chat_resume(request: dict, user=Depends(verify_token)):
    """
    interrupt 재개 요청
    body: { "turn_id": "...", "resume_value": "승인" | "취소" | "사용자 추가 답변" }
    turn_id: /chat SSE의 turn_id 이벤트로 받은 값 (MemorySaver 체크포인트 식별)
    """
    turn_id = request.get("turn_id", "")
    resume_value = request.get("resume_value", "")
    config = {"configurable": {"thread_id": turn_id}}

    return StreamingResponse(
        _sse_stream(Command(resume=resume_value), config),
        media_type="text/event-stream",
    )


@router.post("/context/clear")
async def context_clear(request: dict, user=Depends(verify_token)):
    """
    자비스패널 세션 드래프트 정리.

    드래프트가 채팅 밖 경로로 소비됐을 때(예: '폼에서 이어 작성' 후 폼에서 직접 제출)
    클라이언트가 호출해 서버 세션 스토어를 동기화한다 — 2채널은 한 화자.
    """
    session_id = request.get("session_id", "") or str(user.get("sub", ""))
    ai_ctx.clear_session(session_id)
    return {"ok": True}

