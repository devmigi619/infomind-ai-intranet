import re
from datetime import datetime
from typing import TypeVar

from langchain_core.tools import tool
from pydantic import BaseModel

from app.hj.core.config import settings
from app.hj.core.database import get_pool
from app.hj.models.intent import SqlResult


# ── LLM JSON 파싱 공통 유틸 ─────────────────────────────────────────────────

_M = TypeVar("_M", bound=BaseModel)


def parse_llm_json(raw: str, model_cls: type[_M]) -> _M:
    """
    LLM 응답 문자열을 Pydantic 모델로 파싱한다.

    format 제약을 무시하고 ```json ... ``` 블록으로 감싼 경우 블록 내용을 추출해 재시도.
    두 번 모두 실패하면 ValueError를 raise한다 — 호출부에서 오류 응답을 직접 처리할 것.

    SQL 전용 폴백(generate_sql 인라인)과 달리 JSON 블록 전체를 재파싱하는 방식이므로
    Pydantic 모델 파싱에만 사용할 것.
    """
    # 1) 직접 파싱
    try:
        return model_cls.model_validate_json(raw)
    except Exception:
        pass
    # 2) ```json ... ``` 또는 ``` ... ``` 블록 추출 후 재시도
    m = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw, re.IGNORECASE)
    if m:
        try:
            return model_cls.model_validate_json(m.group(1).strip())
        except Exception as e:
            print(f"parse_llm_json 마크다운 추출 후 재파싱 실패: {e}")
    raise ValueError(f"LLM 응답을 {model_cls.__name__}으로 파싱할 수 없습니다. raw={raw[:80]!r}")


# ── Tool 1: 현재 날짜 ──────────────────────────────────────────────────────

@tool
def get_current_date() -> str:
    """현재 날짜와 시간을 반환합니다.

    Note: 파이프라인에서는 node_enrich_context가 datetime.now()를 직접 사용한다.
          이 tool은 향후 LLM agent 방식으로 전환 시 재활용용으로 보존한다.
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S (%A)")


# ── 벡터 검색 대상 intent ────────────────────────────────────────────────────
# schema.py에 afile_id 컬럼이 존재하는 intent만 포함.
# 새 intent에 afile_id 테이블이 추가되면 여기에도 추가한다.
VECTOR_SEARCH_INTENTS: set[str] = {"brd"}

# ── 결재선 대상 intent + 테이블 매핑 ─────────────────────────────────────────
# excu 실행 시 결재자/참조자 INSERT가 필요한 intent 목록.
# 새 intent 추가 시: APRVL_LINE_INTENTS와 APRVL_TABLE_MAP에만 항목 추가하면 됨.
# graph.py / node_excu_confirm 로직 자체는 변경 불필요.
APRVL_LINE_INTENTS: set[str] = {"leave"}   # "aprv" 테이블 확정 후 추가

APRVL_TABLE_MAP: dict[str, dict] = {
    "leave": {
        "mst_table":     "int_leave_req_mst",
        "aprv_table":    "int_leave_req_aprv",
        "ref_table":     "int_leave_req_ref",
        "pk_user_col":   "req_user_id",          # mst PK (1)
        "pk_sn_col":     "req_sn",               # mst PK (2) — 자동증가
        "pk_sn_query":   "SELECT COALESCE(MAX(req_sn),0)+1 FROM int_leave_req_mst WHERE req_user_id=$1",
        "aprv_user_col": "aprv_user_id",
        "aprv_ord_col":  "aprv_ord",
        "ref_user_col":  "ref_user_id",
    },
    # "aprv": { ... }  ← 전자결재 테이블 확정 후 동일 패턴으로 추가
}

# ── 벡터 검색 고정 SQL 템플릿 ────────────────────────────────────────────────
# $1::vector = node_enrich_context에서 생성한 사용자 메시지 임베딩 벡터.
# node_search에서 user_embedding이 있을 때 직접 실행 — LLM이 생성하지 않음.
VECTOR_SEARCH_SQL: str = """
SELECT
    e.emb_ttl,
    e.ori_desc,
    1-(e.emb_rslt <=> $1::vector) AS similarity
FROM int_com_file_emb e
JOIN int_com_file f ON e.afile_id = f.afile_id AND e.afile_sn = f.afile_sn
WHERE f.del_yn = 'N'
  AND 1-(e.emb_rslt <=> $1::vector) >= 0.6
ORDER BY similarity DESC
LIMIT 10
""".strip()


# ── Tool 2: SQL 생성 (Text-to-SQL) ────────────────────────────────────────

async def generate_sql(
    intent: str,
    action_type: str,
    user_message: str,
    user_id: str,
    context: str = "",
) -> SqlResult:
    """
    intent와 사용자 메시지를 기반으로 LLM이 SQL을 생성합니다. (Text-to-SQL)
    structured output(SqlResult)으로 반환 — sql · missing_info · is_executable 포함.
    """
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_ollama import ChatOllama
    from app.hj.services.prompt import SQL_GENERATION_PROMPT
    from app.hj.services.schema import get_schema_for_intent

    schema = get_schema_for_intent(intent)
    prompt = SQL_GENERATION_PROMPT.format(schema=schema)

    human_content = f"intent={intent}, action_type={action_type}, user_id={user_id}\n질문: {user_message}"
    if context:
        human_content += f"\n\n[추가 컨텍스트]\n{context}"

    # format=SqlResult.model_json_schema(): Ollama constrained generation
    #   - tool call 감지 로직을 건너뜀 → 마크다운 래핑 불가
    # tags=["sql_generation"]: astream_events 에서 SQL 토큰 필터링
    llm = ChatOllama(
        base_url=settings.ollama_url,
        model=settings.llm_model,
        streaming=False,
        format=SqlResult.model_json_schema(),
    )
    slm = ChatOllama(
        base_url=settings.ollama_url,
        model=settings.slm_model,
        streaming=False,
        format=SqlResult.model_json_schema(),
    )

    response = await slm.with_config(tags=["sql_generation"]).ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=human_content),
    ])

    # format 제약을 모델이 무시하고 마크다운 블록(```sql ... ```)을 반환하는 경우 폴백 처리
    # 예: gemma4:32b 가 간헐적으로 JSON 대신 마크다운 SQL을 출력할 수 있음
    raw = response.content
    try:
        result = SqlResult.model_validate_json(raw)
    except Exception:
        import re
        # ```sql ... ``` 또는 ``` ... ``` 블록에서 SQL 추출
        m = re.search(r"```(?:sql)?\s*([\s\S]+?)```", raw, re.IGNORECASE)
        if m:
            extracted_sql = m.group(1).strip()
            result = SqlResult(sql=extracted_sql, missing_info=[], is_executable=True)
        else:
            # 마크다운도 없는 경우 — 실행 불가 결과 반환 (그래프가 node_generate로 라우팅)
            result = SqlResult(sql="", missing_info=[], is_executable=False)

    # LLM이 단일 따옴표를 '' 로 이중 생성하는 경우 보정
    # (PostgreSQL 문자열 이스케이프 관례를 함수 인자 따옴표에 잘못 적용하는 문제)
    if result.sql:
        result.sql = result.sql.replace("''", "'")

    return result


# ── Tool 3: SQL 실행 ────────────────────────────────────────────────────────

# DML(INSERT/UPDATE/DELETE) 허용 테이블 — 테이블 확정 후 개발자가 추가
DML_ALLOWED_TABLES: set[str] = {
    "int_pst",               # 게시글
    "int_pst_cmt",           # 게시글 댓글
    "int_leave_req_mst",     # 휴가신청 마스터 (본인만)
    "int_leave_req_dtl",     # 휴가신청 일별 상세 (본인만)
    "int_leave_req_aprv",    # 휴가신청 결재라인 (build_aprvl_insert_sqls 전용)
    "int_leave_req_ref",     # 휴가신청 참조자 (build_aprvl_insert_sqls 전용)
    # "int_aprv",            # 전자결재
    "int_mtgr_rsv",          # 회의실 예약 (본인만)
    "int_veh_rsv",           # 차량 예약 (본인만)
    # "int_schd",            # 일정
}


def _is_dml(sql: str) -> bool:
    first_word = sql.strip().upper().split()[0]
    if first_word == "WITH":
        # CTE: WITH ... INSERT/UPDATE/DELETE 패턴 판별
        upper = sql.upper()
        return any(kw in upper for kw in ("INSERT INTO", "UPDATE ", "DELETE FROM"))
    return first_word in {"INSERT", "UPDATE", "DELETE"}


def _extract_table(sql: str) -> str:
    """SQL에서 첫 번째 대상 테이블명 추출 (단순 파싱)"""
    tokens = sql.upper().split()
    for kw in ("INTO", "UPDATE", "FROM"):
        if kw in tokens:
            idx = tokens.index(kw)
            if idx + 1 < len(tokens):
                return tokens[idx + 1].lower().strip("(,;")
    return ""


async def execute_vector_sql(sql: str, embedding: list[float]) -> list[dict]:
    """
    $1::vector 파라미터 바인딩으로 벡터 검색 SQL을 실행합니다.
    asyncpg + pgvector는 str(embedding) 을 vector 타입으로 캐스팅합니다.
    SELECT 전용 — DML 불허.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, str(embedding))
        return [dict(r) for r in rows]


@tool
async def execute_sql(sql: str, user_id: str) -> list[dict] | int:
    """
    SQL을 ParadeDB에 실행합니다.
    - SELECT: 항상 허용, 결과 list[dict] 반환
    - DML(INSERT/UPDATE/DELETE): DML_ALLOWED_TABLES에 속한 테이블만 허용, 영향 행 수(int) 반환
    """
    if _is_dml(sql):
        table = _extract_table(sql)
        if table not in DML_ALLOWED_TABLES:
            raise PermissionError(f"DML 허용되지 않은 테이블: {table}")

    pool = await get_pool()
    async with pool.acquire() as conn:
        if _is_dml(sql):
            result = await conn.execute(sql)
            return int(result.split()[-1])  # "INSERT 0 1" → 1
        else:
            rows = await conn.fetch(sql)
            return [dict(r) for r in rows]


# ── 결재선 공통 함수 ──────────────────────────────────────────────────────────

async def fetch_default_aprvl_line(user_id: str) -> dict:
    """
    사용자의 기본 결재선 템플릿(int_user_aprvl)에서 결재자/참조자 목록을 조회한다.
    USE_YN='Y' 인 템플릿 중 첫 번째를 사용한다.
    결재선이 없으면 {aprvl_list: [], ref_list: []} 반환.

    반환 형태:
      aprvl_list: [{aprvUserId, aprvUserNm, deptNm, jbgdNm}, ...]  (aprv_ord 순)
      ref_list:   [{aprvUserId, aprvUserNm, deptNm, jbgdNm}, ...]
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        tmpl = await conn.fetchrow(
            "SELECT aprvl_id FROM int_user_aprvl WHERE user_id=$1 AND use_yn='Y' "
            "ORDER BY crt_at LIMIT 1",
            user_id,
        )
        if not tmpl:
            return {"aprvl_list": [], "ref_list": []}

        aprvl_id = tmpl["aprvl_id"]

        aprv_rows = await conn.fetch(
            "SELECT a.aprv_user_id, u.user_nm, d.dept_nm, j.jbgd_nm "
            "FROM int_user_aprvl_aprv a "
            "JOIN int_user u ON a.aprv_user_id = u.user_id "
            "LEFT JOIN int_dept d ON u.dept_cd = d.dept_cd "
            "LEFT JOIN int_jbgd j ON u.jbgd_cd = j.jbgd_cd "
            "WHERE a.aprvl_id=$1 AND a.user_id=$2 "
            "ORDER BY a.aprv_ord",
            aprvl_id, user_id,
        )
        ref_rows = await conn.fetch(
            "SELECT r.ref_user_id, u.user_nm, d.dept_nm, j.jbgd_nm "
            "FROM int_user_aprvl_ref r "
            "JOIN int_user u ON r.ref_user_id = u.user_id "
            "LEFT JOIN int_dept d ON u.dept_cd = d.dept_cd "
            "LEFT JOIN int_jbgd j ON u.jbgd_cd = j.jbgd_cd "
            "WHERE r.aprvl_id=$1 AND r.user_id=$2",
            aprvl_id, user_id,
        )

    return {
        "aprvl_list": [
            {
                "aprvUserId": r["aprv_user_id"],
                "aprvUserNm": r["user_nm"],
                "deptNm":     r["dept_nm"],
                "jbgdNm":     r["jbgd_nm"],
            }
            for r in aprv_rows
        ],
        "ref_list": [
            {
                "aprvUserId": r["ref_user_id"],
                "aprvUserNm": r["user_nm"],
                "deptNm":     r["dept_nm"],
                "jbgdNm":     r["jbgd_nm"],
            }
            for r in ref_rows
        ],
    }


def build_aprvl_insert_sqls(
    intent: str,
    req_user_id: str,
    req_sn: int,
    aprvl_list: list[dict],
    ref_list: list[dict],
    executor_id: str,
) -> list[str]:
    """
    APRVL_TABLE_MAP 기반으로 결재자/참조자 INSERT SQL 리스트를 생성한다.
    LLM을 사용하지 않고 코드로 직접 생성 — FK 정합성 보장.

    aprvl_list 항목: {"aprvUserId": "..."}  (프론트가 전송하는 최소 구조)
    ref_list 항목:   {"aprvUserId": "..."} 또는 단순 문자열 user_id
    """
    cfg  = APRVL_TABLE_MAP[intent]
    sqls: list[str] = []

    for i, a in enumerate(aprvl_list, start=1):
        uid = a["aprvUserId"] if isinstance(a, dict) else a
        sqls.append(
            f"INSERT INTO {cfg['aprv_table']} "
            f"({cfg['pk_user_col']},{cfg['pk_sn_col']},{cfg['aprv_user_col']},{cfg['aprv_ord_col']},"
            f"crt_at,crt_by,crt_ip,upd_at,upd_by,upd_ip) "
            f"VALUES ('{req_user_id}',{req_sn},'{uid}',{i},"
            f"NOW(),'{executor_id}','127.0.0.1',NOW(),'{executor_id}','127.0.0.1')"
        )

    for r in ref_list:
        uid = r["aprvUserId"] if isinstance(r, dict) else r
        sqls.append(
            f"INSERT INTO {cfg['ref_table']} "
            f"({cfg['pk_user_col']},{cfg['pk_sn_col']},{cfg['ref_user_col']},"
            f"crt_at,crt_by,crt_ip,upd_at,upd_by,upd_ip) "
            f"VALUES ('{req_user_id}',{req_sn},'{uid}',"
            f"NOW(),'{executor_id}','127.0.0.1',NOW(),'{executor_id}','127.0.0.1')"
        )

    return sqls


async def execute_sql_transaction(sqls: list[str], user_id: str) -> int:
    """
    여러 DML SQL을 asyncpg 트랜잭션으로 실행한다.
    하나라도 실패하면 전체 롤백 — 부분 커밋 없음.
    모든 SQL에 대해 DML_ALLOWED_TABLES 검사를 사전 수행한다.

    반환: 총 영향 행 수 (INSERT/UPDATE/DELETE 결과 합산)
    """
    # 실행 전 전체 권한 검사
    for sql in sqls:
        if _is_dml(sql):
            table = _extract_table(sql)
            if table not in DML_ALLOWED_TABLES:
                raise PermissionError(f"DML 허용되지 않은 테이블: {table}")

    pool = await get_pool()
    total = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            for sql in sqls:
                result = await conn.execute(sql)
                if _is_dml(sql):
                    total += int(result.split()[-1])
    return total
