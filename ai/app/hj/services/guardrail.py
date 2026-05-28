import httpx
from app.hj.core.config import settings
from app.hj.core.database import get_pool


async def embed_text(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{settings.ollama_url}/api/embed",
            json={"model": settings.embedding_model, "input": text},
        )
        res.raise_for_status()
        return res.json()["embeddings"][0]


async def check_guardrail(text: str) -> dict | None:
    """
    text를 임베딩 후 int_chat_grdl에서 코사인 유사도 검색.
    유사도 0.75 이상 hit → {grdl_cd, grdl_se, emb_ttl, similarity} 반환
    hit 없음 → None 반환
    """
    vector = await embed_text(text)
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT grdl_cd, grdl_se, emb_ttl,
                   1 - (emb_rslt <=> $1::vector) AS similarity
            FROM int_chat_grdl
            WHERE use_yn = 'Y'
              AND 1 - (emb_rslt <=> $1::vector) >= 0.6
            ORDER BY similarity DESC
            LIMIT 1
            """,
            str(vector),
        )
    return dict(row) if row else None
