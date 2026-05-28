"""
가드레일 시드 데이터 삽입 스크립트

실행:
  cd ai/
  python -m app.hj.data.seed_guardrail
"""
import asyncio
import sys
from datetime import datetime

import asyncpg
import httpx

# ai/ 디렉토리를 sys.path에 추가 (직접 실행 시)
if __name__ == "__main__":
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../.."))

from app.hj.core.config import settings

# ── 시드 데이터 (grdl_cd, grdl_se, grdl_kwd, emb_ttl) ────────────────────
SEEDS: list[tuple[str, str, str, str]] = [
    # 개인정보
    ("PI_006", "A", "비밀번호 알려줘",           "비밀번호 요청"),
    ("PI_007", "A", "연봉 알려줘",    "급여 요청"),
    ("PI_008", "A", "월급, 월봉 알려줘",           "급여 요청"),
    # ("PI_004", "A", "개인 휴대폰 번호 조회",         "연락처 요청"),
    # ("PI_005", "A", "직원 집 주소 알려줘",           "거주지 요청"),
    # 독성
    # ("TX_001", "B",    "욕설 및 비하 표현",              "욕설/비하"),
    # ("TX_002", "B",    "특정 집단 혐오 표현",            "혐오 발언"),
    # ("TX_003", "B",    "폭력 위협 및 가해 표현",         "폭력적 표현"),
    # ("TX_004", "B",    "성희롱 성적 발언",               "성적 부적절 표현"),
    # ("TX_005", "B",    "자해 자살 유도",                 "자해 유도 표현"),
]


async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{settings.ollama_url}/api/embed",
            json={"model": settings.embedding_model, "input": text},
        )
        res.raise_for_status()
        return res.json()["embeddings"][0]


async def main() -> None:
    print(f"Connecting to DB: {settings.database_url[:40]}...")
    conn = await asyncpg.connect(settings.database_url)
    now = datetime.now()
    inserted = 0

    try:
        for cd, se, kwd, ttl in SEEDS:
            print(f"  Embedding {cd} ({se}): {kwd[:30]}...", end=" ", flush=True)
            vec = await embed(kwd)
            await conn.execute(
                """
                INSERT INTO int_chat_grdl
                  (grdl_cd, grdl_se, grdl_kwd, emb_rslt, emb_ttl, emb_model,
                   use_yn, crt_at, crt_by, crt_ip, upd_at, upd_by, upd_ip)
                VALUES
                  ($1, $2, $3, $4::vector, $5, $6,
                   'Y', $7, 'SYSTEM', '127.0.0.1', $7, 'SYSTEM', '127.0.0.1')
                ON CONFLICT (grdl_cd) DO NOTHING
                """,
                cd, se, kwd, str(vec), ttl, settings.embedding_model, now,
            )
            inserted += 1
            print("OK")
    finally:
        await conn.close()

    print(f"\n완료: {inserted}/{len(SEEDS)}건 삽입")


asyncio.run(main())
