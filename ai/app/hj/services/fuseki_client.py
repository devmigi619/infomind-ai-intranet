"""Fuseki 비동기 SPARQL 클라이언트 — 추론 Graph RAG 읽기 전용 접근.

추론 데이터셋(/intranet-r, OWLMicro 리즈너)에 SPARQL SELECT/ASK를 실행한다.
챗봇은 조회만 하므로 SPARQL Update(INSERT/DELETE/DROP 등)는 차단한다.

  - 엔드포인트는 데이터셋 베이스 URL에 POST(application/x-www-form-urlencoded).
  - 리즈너가 켜진 데이터셋이라 rdfs:subClassOf 상속 등 추론 결과까지 조회된다.
  - SELECT 결과는 {var: value} 형태의 단순 dict 리스트로 평탄화한다.
"""

from __future__ import annotations

import re

import httpx

from app.hj.core.config import settings

# SPARQL Update / 관리 구문 — 하나라도 있으면 거부(읽기 전용 보장)
_WRITE_KEYWORDS = re.compile(
    r"\b(INSERT|DELETE|DROP|CLEAR|CREATE|LOAD|COPY|MOVE|ADD)\b",
    re.IGNORECASE,
)


def _is_read_only(sparql: str) -> bool:
    return not _WRITE_KEYWORDS.search(sparql)


def _enforce_limit(sparql: str, default_limit: int = 100) -> str:
    """SELECT 에 LIMIT 이 없으면 강제로 덧붙인다(폭주 방지)."""
    if not re.search(r"\bSELECT\b", sparql, re.IGNORECASE):
        return sparql  # ASK/CONSTRUCT/DESCRIBE 는 그대로
    if re.search(r"\bLIMIT\b", sparql, re.IGNORECASE):
        return sparql
    return f"{sparql.rstrip().rstrip(';')}\nLIMIT {default_limit}"


def _flatten(results: dict) -> list[dict]:
    """SPARQL JSON 결과(head/results.bindings)를 {var: value} 리스트로 변환."""
    rows = []
    for b in results.get("results", {}).get("bindings", []):
        rows.append({k: v.get("value") for k, v in b.items()})
    return rows


async def run_select(sparql: str, limit: int = 100) -> list[dict]:
    """읽기 전용 SPARQL 실행 → list[dict]. 쓰기 구문은 PermissionError."""
    if not _is_read_only(sparql):
        raise PermissionError("읽기 전용: SPARQL Update 구문은 허용되지 않습니다.")
    query = _enforce_limit(sparql, limit)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            settings.fuseki_url,
            data={"query": query},
            headers={"Accept": "application/sparql-results+json"},
            auth=(settings.fuseki_user, settings.fuseki_password),
        )
        resp.raise_for_status()
        return _flatten(resp.json())
