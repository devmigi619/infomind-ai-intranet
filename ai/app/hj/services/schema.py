"""
intent별 테이블 구조·관계·규칙 정의를 schema.json에서 로드한다.

스키마 본문(테이블 구조·관계·INSERT 규칙)은 schema.json에 JSON으로 관리한다.
이 모듈은 JSON을 읽어 LLM 프롬프트로 전달할 JSON 문자열을 조립한다.

  - get_schema_for_intent(intent, mode) → JSON 문자열
      "full"   : 공통+intent 테이블 + insert_rules + 함수/전역규칙 (SQL 생성용)
      "lookup" : 경량 — insert_rules·예시·lookup_exclude 테이블 제거 (ReAct 조회 루프용)

참조 데이터 쿼리(INTENT_REFERENCE_QUERIES)와 preflight 필수항목(PREFLIGHT_REQUIRED_FIELDS)은
테이블 구조와 별개의 관심사이므로 이 파일에서 Python 리터럴로 유지한다.
"""

import json
from copy import deepcopy
from pathlib import Path

_SCHEMA_PATH = Path(__file__).with_name("schema.json")

with _SCHEMA_PATH.open(encoding="utf-8") as _f:
    _SCHEMA: dict = json.load(_f)


# ── 경량(lookup) 스키마 변환 ──────────────────────────────────────────────────
# ReAct 조회 루프(node_react_gather)는 "레코드 찾기"만 수행하므로
# INSERT 규칙·예시 SQL·전역 _SE 규칙 등 SQL 생성 전용 내용이 필요 없다.
# 토큰 절감을 위해 테이블 헤더·컬럼·키(FK/JOIN/PK)·함수 시그니처만 남긴다.
#   - insert_rules 블록 통째로 제거
#   - 테이블별 examples 제거, lookup_exclude=true 테이블 제거
#   - 함수 시그니처는 유지(조회에 필요), 함수 example은 제거
#   - 전역 규칙(global_rules: _SE 컬럼 규칙)은 SQL 생성 전용이므로 제거
#
# 벡터 검색(int_com_file_emb)은 execute_vector_sql 고정 템플릿이 전담하므로,
# ReAct LLM에게 emb_rslt(vector) 컬럼을 노출하면 직접 SELECT를 시도해 할루시네이션이 발생한다.
# → lookup_exclude=true 로 표시된 테이블은 경량 스키마에서 제외한다.


def _table_to_lookup(table: dict) -> dict:
    """테이블 항목에서 SQL 생성 전용 필드(examples·함수 example)를 제거한 사본."""
    t = deepcopy(table)
    t.pop("examples", None)
    for fn in t.get("functions", []) or []:
        fn.pop("example", None)
    return t


def get_schema_for_intent(intent: str, mode: str = "full") -> str:
    """
    공통 테이블(int_user, int_dept, int_jbgd, int_com_code) + intent 전용 테이블을 합쳐
    JSON 문자열로 반환한다. 공통 테이블은 항상 앞에 위치해 LLM이 JOIN 대상을 먼저 인식하도록 한다.

    mode:
      "full"   — 전체 스키마 (SQL 생성용, 기본값). generate_sql이 사용.
      "lookup" — 경량 스키마 (ReAct 조회 루프용). INSERT 규칙·예시 SQL 제거로 토큰 절감.
    """
    intent_def = _SCHEMA.get("intents", {}).get(intent, {})
    common = deepcopy(_SCHEMA.get("common_tables", []))
    tables = common + deepcopy(intent_def.get("tables", []))
    # intent 레벨 DB 함수(예: 일정 F_SCHD_QRY) — 조회·생성 모두 필요
    intent_functions = deepcopy(intent_def.get("functions", []))

    if mode == "lookup":
        tables = [_table_to_lookup(t) for t in tables if not t.get("lookup_exclude")]
        for fn in intent_functions:        # 함수 시그니처는 유지, 사용 예시는 제거
            fn.pop("example", None)
        payload = {
            "functions": _SCHEMA.get("functions", {}),
            "tables": tables,
        }
        if intent_functions:
            payload["db_functions"] = intent_functions
    else:
        payload = {
            "functions": _SCHEMA.get("functions", {}),
            "global_rules": _SCHEMA.get("global_rules", {}),
            "tables": tables,
        }
        if intent_functions:
            payload["db_functions"] = intent_functions
        if insert_rules := intent_def.get("insert_rules"):
            payload["insert_rules"] = insert_rules

    return json.dumps(payload, ensure_ascii=False, indent=2)


# ── intent별 참조 데이터 쿼리 ──────────────────────────────────────────────────
# node_enrich_context에서 SQL 생성·preflight 이전에 실행하여
# LLM에게 DB에 실제 존재하는 코드값·ID 목록을 제공한다.
# 쿼리는 경량 마스터 조회만 허용 (WHERE use_yn='Y' 필수).

# 각 항목: {"label": 표시용 라벨, "sql": nm(표시명)·cd(코드값) 2컬럼 SELECT}
# node_enrich_context가 결과를 "표시명=코드값" 컴팩트 매핑으로 포맷해 주입한다.
# → SLM이 사용자 표현("연차")을 코드값('LEAVE_00001')으로 변환하기 쉬움.
# SELECT는 반드시 nm, cd 두 컬럼으로 alias 할 것.

INTENT_REFERENCE_QUERIES: dict[str, list[dict]] = {
    "leave": [
        {"label": "휴가유형(leave_cd)",
         "sql": "SELECT leave_nm AS nm, leave_cd AS cd FROM int_leave_mst "
                "WHERE use_yn='Y' ORDER BY leave_cd"},
        {"label": "휴가상세(leave_dtl_cd) — 표기: 휴가명 상세명(leave_cd=상위코드)=leave_dtl_cd",
         "sql": "SELECT lm.leave_nm||' '||ld.leave_dtl_nm||'(leave_cd='||ld.leave_cd||')' AS nm, "
                "ld.leave_dtl_cd AS cd "
                "FROM int_leave_dtl ld JOIN int_leave_mst lm ON ld.leave_cd = lm.leave_cd "
                "WHERE ld.use_yn='Y' ORDER BY ld.leave_cd, ld.leave_dtl_cd"},
        {"label": "결재결과(aprv_rslt_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='APRV_RSLT_SE' AND cd_lvl='2'"},
    ],
    "mtgr": [
        {"label": "회의실(mtgr_id)",
         "sql": "SELECT mtgr_nm AS nm, mtgr_id AS cd FROM int_mtgr "
                "WHERE use_yn='Y' ORDER BY mtgr_id"},
    ],
    "veh": [
        {"label": "차량(veh_id)",
         "sql": "SELECT veh_nm AS nm, veh_id AS cd FROM int_veh "
                "WHERE use_yn='Y' ORDER BY veh_id"},
    ],
    "brd": [
        {"label": "게시판(brd_id)",
         "sql": "SELECT brd_nm AS nm, brd_id AS cd FROM int_brd "
                "WHERE use_yn='Y' ORDER BY brd_id"},
    ],
    "schd": [
        {"label": "반복주기(loop_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='LOOP_SE' AND cd_lvl='2'"},
    ],
    "aprv": [
        {"label": "결재양식(aprv_form_id)",
         "sql": "SELECT aprv_form_nm AS nm, aprv_form_id AS cd FROM int_aprv_form_mst "
                "WHERE del_yn='N' ORDER BY aprv_form_id"},
        {"label": "양식항목(aprv_ref_cd) — 표기: 양식명 항목명(reqd_yn=필수여부)(aprv_form_id=양식코드)=항목코드",
         "sql": "SELECT m.aprv_form_nm||' '||d.aprv_ref_nm||'(reqd_yn='||d.reqd_yn||')(aprv_form_id='||d.aprv_form_id||')' AS nm, "
                "d.aprv_ref_cd AS cd "
                "FROM int_aprv_form_dtl d JOIN int_aprv_form_mst m ON d.aprv_form_id = m.aprv_form_id "
                "WHERE d.del_yn='N' AND m.del_yn='N' ORDER BY d.aprv_form_id, d.aprv_ref_cd"},
        {"label": "결재결과(aprv_rslt_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='APRV_RSLT_SE' AND cd_lvl='2'"},
    ],
    "rpt": [
        {"label": "보고 양식(rpt_form_id) — 표기: 양식제목(보고주기)",
         "sql": "SELECT rpt_ttl||'('||rpt_dt_se||')' AS nm, rpt_form_id AS cd "
                "FROM int_rpt_form WHERE use_yn='Y' ORDER BY rpt_form_id"},
        {"label": "최근 회차(round_sn) — 표기: 양식제목 회차명(기준날짜)(rpt_form_id=양식코드)=회차번호",
         "sql": "SELECT f.rpt_ttl||' '||r.round_nm"
                "||'(round_ymd='||COALESCE(r.round_ymd,'')||')"
                "(rpt_form_id='||r.rpt_form_id||')' AS nm, "
                "r.round_sn::VARCHAR AS cd "
                "FROM int_rpt_round r JOIN int_rpt_form f ON r.rpt_form_id = f.rpt_form_id "
                "WHERE f.use_yn='Y' ORDER BY r.rpt_form_id, r.round_sn DESC LIMIT 10"},
    ],
    # general: 참조 데이터 불필요 → 미정의(빈 리스트 반환)
}


def get_reference_queries(intent: str) -> list[dict]:
    """intent에 해당하는 참조 쿼리 스펙(label+sql) 목록을 반환한다. 없으면 빈 리스트."""
    return INTENT_REFERENCE_QUERIES.get(intent, [])


# ── node_excu_preflight 전용 필수 입력 항목 ───────────────────────────────────
# 전체 SQL 스키마 대신 "사용자에게 확인해야 할 항목"만 짧게 기술한다.
# generate_sql은 여전히 get_schema_for_intent()의 전체 스키마를 사용한다.

PREFLIGHT_REQUIRED_FIELDS: dict[str, str] = {
    "leave": (
        "필수: 시작날짜, 종료날짜\n"
        "조건부: 시작시간·종료시간 (반차 등 시간단위 신청인 경우만)\n"
        "선택: 사유 (미입력이어도 is_complete=true — 기본값은 SQL 생성 시 자동 적용)\n"
        "[제약] 결재자가 한명이라도 결재완료일경우 취소, 삭제 불가\n"
        "[자동판단] 휴가유형: 사용자 표현('연차','반차' 등)과 참조데이터(int_leave_mst·int_leave_dtl)로 자동 결정 — 사용자에게 따로 묻지 않음"
    ),
    "mtgr": "필수: 예약날짜, 시작시간, 종료시간\n"
            "[제약] 동일한 회의실, 동일한 날짜, 겹치는 시간은 예약불가\n"
            "[제약] 이미 시작된 회의실 예약은은 반납, 연장만 가능\n"
            "[제약] 이미 종료된 회의실 예약은 변경 불가"
            "[자동판단] 회의실 : 사용자가 따로 회의실을 지정하지 않았을 경우 참조데이터 (int_mtgr·int_mtgr_rsv)로 자동결정 - 사용하는 첫번째 회의실로 결정 ",
    "veh":  "필수: 차량, 예약 시작일자, 시작시간, 종료시간\n"
            "[제약] 이미 시작된 차량 예약은 반납, 연장만 가능\n"
            "[제약] 이미 종료된 차량 예약은 변경 불가",
    "aprv": (
        "필수: 결재양식 선택, 해당 양식의 reqd_yn='Y' 항목 모두 입력\n"
        "[제약] 결재자가 한명이라도 결재완료일경우 취소, 삭제 불가\n"
        "[자동판단] 양식: [참조 코드]의 결재양식 목록에서 사용자 요청에 맞는 양식 자동 결정 — 따로 묻지 않음\n"
        "[자동판단] 항목값: [참조 코드 - 양식항목]에서 reqd_yn='Y'인 항목만 사용자에게 확인. 'N' 항목은 생략 가능"
    ),
    "brd":  "필수: 게시판, 제목, 본문\n"
            "[권한] 수정/삭제 : 본인이 작성한 게시판만",
    "schd":  "필수: 일정이름, 일정시작일자, 일정종료일자\n"
             "[권한] 수정/삭제 : 본인이 작성한 일정만\n"
             "[규칙] 반복일정으로 판단되면 공통코드 LOOP_SE를 판단하여 반복주기 입력 필수",
    "rpt": (
        "필수: 보고 양식, 회차 — [참조 코드]에서 자동 결정, 미언급이면 최신 회차\n"
        "exec_desc·plan_desc·sbmt_yn: 폼 패널에서 입력 → 내용 없어도 is_complete=true\n"
        "[권한] 수정/삭제: 본인 보고만. 제출완료(sbmt_yn='Y') 건 변경 불가\n"
        "[회차관리] 양식 관리자(rpt_adm_id)만 가능"
    ),
}


def get_preflight_fields(intent: str) -> str:
    """intent에 해당하는 preflight 필수 입력 항목 설명을 반환한다."""
    return PREFLIGHT_REQUIRED_FIELDS.get(intent, "필수 항목: 요청 내용에 필요한 핵심 정보")
