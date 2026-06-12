"""
ai_context — 자비스패널(채팅의 사물 채널) payload 빌더.

설계 개요
---------
- `ai_context` SSE 이벤트의 페이로드를 구성한다.
- 2단 구조:
    1) composer  — 규칙 기반. 뭘 보여줄지 결정(plan dict 반환). DB 접근·값 채우기 없음.
    2) resolver  — async. plan을 받아 DB 조회·값 채우기 후 AiContextPayload dict 반환.
- 세션 스토어는 파일럿 한정 인메모리(모듈 수준 dict).
  단일 프로세스 전제 — 멀티 워커 배포 시 Redis 등 외부 스토어로 교체 필요.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel

log = logging.getLogger(__name__)


# ── Pydantic 모델 ─────────────────────────────────────────────────────────────

class AiContextField(BaseModel):
    key: str
    label: str
    value: str


class AiContextSubmit(BaseModel):
    label: str = "이 내용으로 실행"
    enabled: bool = False


class AiContextArtifact(BaseModel):
    kind: str = "form"
    id: str
    title: str
    fields: list[AiContextField] = []
    aprvl_list: list[dict] | None = None  # 결재선 읽기 전용 표시용
    submit: AiContextSubmit = AiContextSubmit()


class AiContextBlock(BaseModel):
    kind: str                       # "fact" | "action" (확장형 카탈로그)
    label: str
    value: str | None = None        # fact용
    screen: str | None = None       # action용 — 프론트 setActiveFullScreen 타깃


class AiContextPayload(BaseModel):
    type: str = "ai_context"
    domain: str
    artifact: AiContextArtifact | None = None
    blocks: list[AiContextBlock] = []


_DOMAIN_CONFIG: dict[str, dict[str, str]] = {
    "leave": {
        "create_title": "휴가 신청",
        "create_submit": "이 내용으로 신청",
        "create_completed": "신청 완료 · 결재 진행",
        "update_title": "휴가 신청 변경",
        "delete_title": "휴가 신청 취소",
        "delete_submit": "이 신청 취소",
    },
    "aprv": {
        "create_title": "전자결재 상신",
        "create_submit": "이 내용으로 상신",
        "create_completed": "상신 완료 · 결재 진행",
        "update_title": "전자결재 수정",
        "delete_title": "전자결재 취소",
        "delete_submit": "이 결재 취소",
        "action_label": "전자결재 열기",
        "screen": "approval",
    },
    "brd": {
        "create_title": "게시글 등록",
        "create_submit": "이 내용으로 게시",
        "create_completed": "게시글 등록 완료",
        "update_title": "게시글 수정",
        "delete_title": "게시글 삭제",
        "delete_submit": "이 게시글 삭제",
        "action_label": "게시판 열기",
        "screen": "board",
    },
    "schd": {
        "create_title": "일정 등록",
        "create_submit": "이 내용으로 등록",
        "create_completed": "일정 등록 완료",
        "update_title": "일정 수정",
        "delete_title": "일정 삭제",
        "delete_submit": "이 일정 삭제",
        "action_label": "일정 캘린더 열기",
        "screen": "calendar",
    },
    "veh": {
        "create_title": "차량 예약",
        "create_submit": "이 내용으로 예약",
        "create_completed": "차량 예약 완료",
        "update_title": "차량 예약 변경",
        "delete_title": "차량 예약 취소",
        "delete_submit": "이 예약 취소",
        "action_label": "차량 예약 현황 열기",
        "screen": "vehicle",
    },
    "mtgr": {
        "create_title": "회의실 예약",
        "create_submit": "이 내용으로 예약",
        "create_completed": "회의실 예약 완료",
        "update_title": "회의실 예약 변경",
        "delete_title": "회의실 예약 취소",
        "delete_submit": "이 예약 취소",
        "action_label": "회의실 예약 현황 열기",
        "screen": "meeting",
    },
    "rpt": {
        "create_title": "업무보고 작성",
        "create_submit": "이 내용으로 저장",
        "create_completed": "업무보고 저장 완료",
        "update_title": "업무보고 수정",
        "delete_title": "업무보고 삭제",
        "delete_submit": "이 보고 삭제",
        "action_label": "업무보고 열기",
        "screen": "report",
    },
}

SUPPORTED_DOMAINS = frozenset(_DOMAIN_CONFIG)


def supports_domain(domain: str | None) -> bool:
    return bool(domain and domain in SUPPORTED_DOMAINS)


def infer_operation(sql: str | None) -> str:
    upper = (sql or "").lstrip().upper()
    if upper.startswith("UPDATE"):
        return "update"
    if upper.startswith("DELETE"):
        return "delete"
    return "create"


def _operation_labels(domain: str, operation: str) -> tuple[str, str, str]:
    config = _DOMAIN_CONFIG[domain]
    if operation == "update":
        title = config.get("update_title", f"{config['create_title']} 수정")
        return title, "이 내용으로 수정", f"{title} 완료"
    if operation == "delete":
        title = config.get("delete_title", f"{config['create_title']} 삭제")
        return title, config.get("delete_submit", "이 내용으로 실행"), f"{title} 완료"
    return config["create_title"], config["create_submit"], config["create_completed"]


# ── 세션 스토어 (인메모리, 파일럿 한정) ──────────────────────────────────────
# 구조: { session_id: {"domain": str, "artifact": dict | None} }

_SESSION_CONTEXT: dict[str, dict] = {}


def get_session_artifact(session_id: str) -> dict | None:
    """저장된 artifact dict 반환. 없으면 None."""
    entry = _SESSION_CONTEXT.get(session_id)
    return entry.get("artifact") if entry else None


def store_session_artifact(session_id: str, domain: str, artifact: dict | None) -> None:
    """세션에 domain + artifact를 저장한다."""
    _SESSION_CONTEXT[session_id] = {"domain": domain, "artifact": artifact}


def clear_session(session_id: str) -> None:
    """세션 컨텍스트를 삭제한다."""
    _SESSION_CONTEXT.pop(session_id, None)


def describe_session_context(session_id: str) -> str | None:
    """
    현재 세션의 자비스패널 표시 내용을 응답 생성 LLM에게 알려줄 한 줄 요약.

    2채널은 한 화자 — AI가 자기 패널에 뭘 띄웠는지 알아야
    "패널에 이미 표시되어 있습니다" 같은 참조 응답이 가능하다.
    표시 중인 게 없으면 None.
    """
    entry = _SESSION_CONTEXT.get(session_id)
    artifact = entry.get("artifact") if entry else None
    if not artifact:
        return None
    domain = entry.get("domain") or ""
    config = _DOMAIN_CONFIG.get(domain, {})
    title = config.get("create_title", domain)
    fields = ", ".join(f"{k}={v}" for k, v in artifact.items())
    return (
        f"{title} 드래프트({fields})와 실행/취소 버튼이 우측 패널에 표시되어 있음"
    )


def clear_on_domain_switch(session_id: str, new_intent: str) -> None:
    """
    도메인 전환 감지 — 설계(jarvis-panel-design.md §3):
    현재 도메인과 new_intent가 다를 때만 컨텍스트를 소멸시킨다.
    도메인 불명 발화("그거 어떻게 됐어?" 등)는 호출하지 않는다.
    """
    entry = _SESSION_CONTEXT.get(session_id)
    if entry and entry.get("domain") != new_intent:
        clear_session(session_id)


# ── Composer (규칙 기반, DB 접근·값 없음) ────────────────────────────────────

def compose(
    *,
    domain: str,
    operation: str,
    pending_artifact: dict | None,
    session_id: str,
    submit_enabled: bool,
    completed: bool,
) -> dict:
    """
    공통 편성자 — "뭘 보여줄지"만 결정하고 값은 채우지 않는다.

    반환 plan dict:
      - domain          : 업무 intent
      - artifact_source : 드래프트 dict 또는 None
                          · pending_artifact 우선
                          · 없으면 세션 스토어에서 복원 (노이즈 턴에도 유실 없음)
                          · completed=True이면 무조건 None (신청 완료 → 드래프트 소멸)
      - submit_enabled  : bool
      - blocks          : plan 수준 블록 목록 (fact_query는 resolver가 값 채움)
    """
    if completed:
        artifact_source = None
    else:
        artifact_source = pending_artifact or get_session_artifact(session_id)

    config = _DOMAIN_CONFIG[domain]
    artifact_title, submit_label, completed_label = _operation_labels(domain, operation)
    blocks: list[dict[str, Any]] = []

    if completed:
        blocks.append({
            "kind": "fact",
            "label": artifact_title,
            "value": completed_label,
        })

    if domain == "leave":
        # 연차 현황 — resolver가 DB 조회로 값을 채운다.
        blocks.append({
            "kind": "fact_query",
            "query": "leave_balance",
            "label": "연차",
        })
        blocks.append({
            "kind": "action",
            "label": "인사팀 문의",
        })
    elif action_label := config.get("action_label"):
        blocks.append({
            "kind": "action",
            "label": action_label,
            "screen": config.get("screen"),
        })

    return {
        "domain": domain,
        "artifact_source": artifact_source,
        "artifact_title": artifact_title,
        "submit_label": submit_label,
        "submit_enabled": submit_enabled,
        "completed": completed,
        "blocks": blocks,
    }


# ── 연차 현황 조회 SQL ────────────────────────────────────────────────────────
# 출처: backend/src/main/resources/mapper/LeaveBalanceMapper.xml
# entitled: f_leave_calc($1) — DB 함수로 부여 연차 계산
# used    : 당해연도 승인(aprv_rslt_se='3') + 차감대상(ded_yn='Y') 휴가 사용일수 합계

_LEAVE_BALANCE_SQL = """
SELECT f_leave_calc($1) AS entitled,
       COALESCE((
         SELECT SUM(t.leave_use_dcnt) FROM (
           SELECT m.req_sn, m.leave_use_dcnt
           FROM int_leave_req_mst m
           JOIN int_leave_req_dtl d ON d.req_user_id = m.req_user_id AND d.req_sn = m.req_sn
           JOIN int_leave_mst lm ON lm.leave_cd = m.leave_cd
           WHERE m.req_user_id = $1 AND m.aprv_rslt_se = '3' AND lm.ded_yn = 'Y'
           GROUP BY m.req_sn, m.leave_use_dcnt
           HAVING SUBSTR(MIN(d.leave_use_ymd), 1, 4) = TO_CHAR(CURRENT_DATE, 'YYYY')
         ) t
       ), 0) AS used
""".strip()


# ── Resolver (async, 값 채우기 + DB 조회) ────────────────────────────────────

async def resolve(
    plan: dict,
    *,
    user_id: str,
    session_id: str,
    aprvl_list: list | None = None,
) -> dict:
    """
    plan dict를 받아 AiContextPayload dict를 반환한다.

    - artifact_source dict → AiContextArtifact 빌드
      · 각 key/value 쌍 → AiContextField (키를 label로 그대로 사용)
      · aprvl_list 파라미터가 있으면 artifact에 첨부
      · submit.enabled = plan["submit_enabled"]
    - fact_query 블록 → DB 조회 후 fact 블록으로 변환
      · 실패 시 value="조회 불가"로 폴백, 경고 로그 출력. SSE 스트림을 끊지 않는다.
    - fact / action 블록 → 그대로 통과
    - 세션 스토어 갱신:
      · artifact 있음  → store_session_artifact
      · completed plan → clear_session
    """
    from app.hj.core.database import get_pool

    domain: str = plan["domain"]
    artifact_source: dict | None = plan.get("artifact_source")
    artifact_title: str = plan.get("artifact_title", "실행 내용")
    submit_label: str = plan.get("submit_label", "이 내용으로 실행")
    submit_enabled: bool = plan.get("submit_enabled", False)
    plan_blocks: list[dict] = plan.get("blocks", [])

    # ── artifact 빌드 ─────────────────────────────────────────────────────────
    artifact: AiContextArtifact | None = None
    if artifact_source is not None:
        fields = [
            AiContextField(key=k, label=k, value=str(v))
            for k, v in artifact_source.items()
        ]
        artifact = AiContextArtifact(
            id=f"{domain}-draft-{session_id[:8]}",
            title=artifact_title,
            fields=fields,
            aprvl_list=aprvl_list,
            submit=AiContextSubmit(label=submit_label, enabled=submit_enabled),
        )

    # ── blocks 해석 ───────────────────────────────────────────────────────────
    resolved_blocks: list[AiContextBlock] = []

    for b in plan_blocks:
        kind = b.get("kind")

        if kind == "fact_query":
            query = b.get("query")
            label = b.get("label", "")
            value = "조회 불가"  # 기본값 — DB 조회 성공 시 교체

            if query == "leave_balance":
                try:
                    pool = await get_pool()
                    row = await pool.fetchrow(_LEAVE_BALANCE_SQL, user_id)
                    if row is not None and row["entitled"] is not None:
                        entitled = float(row["entitled"])
                        used = float(row["used"] or 0)
                        value = f"잔여 {entitled - used:g}일 / {entitled:g}일"
                except Exception as exc:
                    log.warning("연차 현황 조회 실패 (user_id=%s): %s", user_id, exc)

            resolved_blocks.append(AiContextBlock(kind="fact", label=label, value=value))

        elif kind == "fact":
            resolved_blocks.append(AiContextBlock(
                kind="fact",
                label=b.get("label", ""),
                value=b.get("value"),
            ))

        elif kind == "action":
            resolved_blocks.append(AiContextBlock(
                kind="action",
                label=b.get("label", ""),
                screen=b.get("screen"),
            ))

        else:
            # 알 수 없는 kind — 전방 호환 규칙: 건너뜀
            log.debug("ai_context: 알 수 없는 블록 kind=%s, 건너뜀", kind)

    # ── 세션 스토어 갱신 ─────────────────────────────────────────────────────
    # completed=True → 드래프트 소멸 (설계 §3: 제출됨 → artifact 소멸)
    # artifact 있음  → 세션에 저장 (노이즈 턴 포함 매 턴 스냅샷 갱신)
    # 그 외(조회만)  → 기존 세션 유지 (드래프트 생존)
    if plan.get("completed"):
        clear_session(session_id)
    elif artifact_source is not None:
        store_session_artifact(session_id, domain, artifact_source)

    return AiContextPayload(
        domain=domain,
        artifact=artifact,
        blocks=resolved_blocks,
    ).model_dump()


# ── 진입점 (SSE 레이어가 호출) ────────────────────────────────────────────────

async def build_payload(
    *,
    domain: str,
    operation: str = "create",
    session_id: str,
    user_id: str,
    pending_artifact: dict | None = None,
    submit_enabled: bool = False,
    aprvl_list: list | None = None,
    completed: bool = False,
) -> dict:
    """
    업무 도메인 ai_context 페이로드를 빌드한다.

    SSE 레이어(chat.py)가 이 함수 하나만 호출하면 된다.

    파라미터
    --------
    session_id      : 채팅 세션 ID (세션 스토어 키)
    user_id         : 로그인 사용자 ID (DB 조회 파라미터)
    pending_artifact: LLM이 이번 턴에 추출한 필드 dict (없으면 None)
    submit_enabled  : 신청 버튼 활성화 여부 (필수값 모두 채워졌을 때 True)
    aprvl_list      : 결재선 목록 [{aprvUserId, aprvUserNm, deptNm, jbgdNm}, ...]
    completed       : 신청 완료 턴이면 True — 드래프트 소멸 + 완료 fact 블록 표시
    """
    if domain not in _DOMAIN_CONFIG:
        raise ValueError(f"지원하지 않는 ai_context 도메인: {domain}")

    plan = compose(
        domain=domain,
        operation=operation,
        pending_artifact=pending_artifact,
        session_id=session_id,
        submit_enabled=submit_enabled,
        completed=completed,
    )
    return await resolve(plan, user_id=user_id, session_id=session_id, aprvl_list=aprvl_list)
