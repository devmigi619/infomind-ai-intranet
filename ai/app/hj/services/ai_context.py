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
    label: str = "이 내용으로 신청"
    enabled: bool = False


class AiContextArtifact(BaseModel):
    kind: str = "form"
    id: str
    title: str = "휴가 신청"
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

def compose_leave(
    *,
    pending_artifact: dict | None,
    session_id: str,
    submit_enabled: bool,
    completed: bool,
) -> dict:
    """
    휴가 도메인 편성자 — "뭘 보여줄지"만 결정하고 값은 채우지 않는다.

    반환 plan dict:
      - domain          : "leave"
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

    blocks: list[dict[str, Any]] = []

    if completed:
        # 신청 완료 시에만 노출 — artifact 소멸 후 사실 블록으로 변환
        blocks.append({
            "kind": "fact",
            "label": "휴가 신청",
            "value": "신청 완료 · 결재 진행",
        })

    # 연차 현황 — "잔여 n일 / 부여 m일" 통합 fact. resolver가 DB 조회로 값을 채운다
    blocks.append({
        "kind": "fact_query",
        "query": "leave_balance",
        "label": "연차",
    })

    # 인사팀 문의 — 이동할 화면이 아직 없음. screen 없는 action은 프론트가 '준비 중' 안내
    blocks.append({
        "kind": "action",
        "label": "인사팀 문의",
    })

    # NOTE: ambient 편성 합의(2026-06-11): 단순 페이지 이동 액션은 두지 않는다(이양 버튼이 대체).
    # 규정 doc 블록(발화 기반 벡터 검색)과 조회 턴 table 블록은 후속 — jarvis-panel-design.md 참조.

    return {
        "domain": "leave",
        "artifact_source": artifact_source,
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
            id=f"leave-draft-{session_id[:8]}",
            fields=fields,
            aprvl_list=aprvl_list,
            submit=AiContextSubmit(enabled=submit_enabled),
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

async def build_leave_payload(
    *,
    session_id: str,
    user_id: str,
    pending_artifact: dict | None = None,
    submit_enabled: bool = False,
    aprvl_list: list | None = None,
    completed: bool = False,
) -> dict:
    """
    휴가 도메인 ai_context 페이로드를 빌드한다.

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
    plan = compose_leave(
        pending_artifact=pending_artifact,
        session_id=session_id,
        submit_enabled=submit_enabled,
        completed=completed,
    )
    return await resolve(plan, user_id=user_id, session_id=session_id, aprvl_list=aprvl_list)
