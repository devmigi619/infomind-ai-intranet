import logging

import httpx

from app.hj.core.config import settings

logger = logging.getLogger(__name__)


async def summarize(purpose: str, content: str) -> str:
    prompt = (
        "다음 내용을 업무용 한국어로 간결하게 요약하세요. "
        "사실을 추가하거나 추측하지 말고, 핵심 진행사항과 향후 계획을 구분해 작성하세요. "
        "요약 본문만 반환하세요.\n\n"
        f"[요약 목적]\n{purpose}\n\n"
        f"[원문]\n{content}"
    )
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={"model": settings.llm_model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            summary = (response.json() or {}).get("response", "").strip()
    except Exception:
        logger.exception("공통 요약 LLM 호출 실패")
        raise
    if not summary:
        raise ValueError("요약 결과가 비어 있습니다.")
    return summary
