import logging
import asyncpg
from app.hj.core.config import settings

_pool: asyncpg.Pool | None = None

_log = logging.getLogger(__name__)


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                settings.database_url, min_size=2, max_size=10
            )
        except Exception as e:
            _log.error(f"DB 풀 초기화 실패: {e}")
            raise
    return _pool
