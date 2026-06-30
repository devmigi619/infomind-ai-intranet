"""Neo4j 비동기 클라이언트 — Graph RAG 읽기 전용 접근.

ReAct 루프의 execute_cypher_tool 에서 사용한다. 챗봇은 그래프를 '조회'만 하므로
쓰기 구문(CREATE/MERGE/DELETE/SET/REMOVE 등)은 차단한다.

  - 드라이버는 프로세스당 1개(싱글톤)로 재사용한다(연결 풀 내장).
  - 모든 질의는 자동 LIMIT 가 강제되어 폭주를 막는다.
"""

from __future__ import annotations

import re

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.hj.core.config import settings

# 쓰기/스키마 변경 키워드 — 하나라도 있으면 거부(읽기 전용 보장)
_WRITE_KEYWORDS = re.compile(
    r"\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|CALL\s+apoc\.(create|merge|refactor)|"
    r"LOAD\s+CSV|FOREACH|n10s\.)\b",
    re.IGNORECASE,
)

_driver: AsyncDriver | None = None


def get_driver() -> AsyncDriver:
    """싱글톤 비동기 드라이버. 최초 호출 시 생성."""
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


async def close_driver() -> None:
    """앱 종료(lifespan) 시 호출."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


def _is_read_only(cypher: str) -> bool:
    """쓰기 키워드가 없으면 읽기 전용으로 간주."""
    return not _WRITE_KEYWORDS.search(cypher)


def _enforce_limit(cypher: str, default_limit: int = 100) -> str:
    """RETURN 이 있고 LIMIT 이 없으면 LIMIT 을 강제로 덧붙인다."""
    if re.search(r"\bLIMIT\b", cypher, re.IGNORECASE):
        return cypher
    if re.search(r"\bRETURN\b", cypher, re.IGNORECASE):
        return f"{cypher.rstrip().rstrip(';')}\nLIMIT {default_limit}"
    return cypher


async def run_read(cypher: str, params: dict | None = None, limit: int = 100) -> list[dict]:
    """읽기 전용 Cypher 실행 → list[dict] 반환.

    쓰기 구문이 감지되면 PermissionError 를 발생시킨다.
    """
    if not _is_read_only(cypher):
        raise PermissionError("읽기 전용: 쓰기/스키마 변경 Cypher 는 허용되지 않습니다.")
    safe = _enforce_limit(cypher, limit)
    driver = get_driver()
    async with driver.session(default_access_mode="READ") as session:
        result = await session.run(safe, params or {})
        return [record.data() async for record in result]
