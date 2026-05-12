"""임베딩 파이프라인 — 청킹, Ollama 임베딩 호출, 키워드 추출.

호출 흐름:
  text -> chunk(800/200) -> for each chunk: embed + extract_keywords -> List[ChunkResult]
"""

import json
import logging
import re

import httpx
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.models.file_embedding import ChunkResult

logger = logging.getLogger(__name__)

# 청킹 정책: 800 토큰 + overlap 200. langchain text splitter는 length=문자수 기준이므로
# 한글 환경에서는 대략 1토큰=2~3자 정도로 보고 충분한 마진을 둠.
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200,
    length_function=len,
)


def chunk_text(text: str) -> list[str]:
    """긴 텍스트를 청크로 분할."""
    if not text or not text.strip():
        return []
    return [c for c in _splitter.split_text(text) if c.strip()]


async def embed_chunks(text: str) -> list[ChunkResult]:
    """텍스트를 청킹 → 각 청크에 대해 임베딩+키워드 추출 후 결과 반환."""
    chunks = chunk_text(text)
    if not chunks:
        return []

    results: list[ChunkResult] = []
    async with httpx.AsyncClient(timeout=300.0) as client:
        for idx, chunk in enumerate(chunks):
            vector = await _embed_one(client, chunk)
            if not vector:
                logger.warning("청크 임베딩 실패 — skip (idx=%d)", idx)
                continue
            # 청크별 태그는 사용 안 함 — 문서 단위 태그를 호출자가 모든 청크에 복사
            results.append(
                ChunkResult(
                    embId=f"chunk_{idx}",
                    text=chunk,
                    vector=vector,
                    tags=[],
                )
            )
    return results


async def extract_doc_tags(text: str) -> dict:
    """문서 전체 텍스트로 LLM 1회 호출해 doc_type/topics/keywords/summary 추출.

    호출 비용을 일정하게 두기 위해 입력은 처음 4000자로 절사. 실패/파싱 실패 시 {} 반환 —
    호출자는 검색 시 벡터 유사도만으로 동작하면 됨.
    """
    if not text or not text.strip():
        return {}
    snippet = text[:4000]

    prompt = (
        "다음 문서의 메타 정보를 JSON으로만 반환해. 다른 설명·머릿말·코드블록 없이 순수 JSON만.\n\n"
        "필드:\n"
        "- doc_type: 문서 유형 (policy / report / manual / notice / contract / free 중 하나)\n"
        "- topics: 핵심 주제 3~5개 (한국어 명사구 배열)\n"
        "- keywords: 핵심 키워드 5~10개 (한국어 단어 또는 짧은 구 배열)\n"
        "- summary: 한 문장 요약 (한국어, 100자 이내)\n\n"
        f"문서:\n{snippet}\n\n"
        '응답 예시: {"doc_type":"policy","topics":["연차","휴가"],"keywords":["연차 신청","3일 전"],"summary":"..."}'
    )

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            res = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.llm_model,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            res.raise_for_status()
            raw = (res.json() or {}).get("response", "")
    except Exception as e:
        logger.warning("문서 태그 추출 LLM 호출 실패: %s", e)
        return {}

    return _parse_doc_tags(raw)


def _parse_doc_tags(raw: str) -> dict:
    """LLM 출력에서 JSON 객체를 안전하게 추출. 첫 '{'~마지막 '}'만 잘라낸다."""
    if not raw:
        return {}
    m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if not m:
        return {}
    try:
        parsed = json.loads(m.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


async def _embed_one(client: httpx.AsyncClient, text: str) -> list[float]:
    """Ollama embeddings API 호출 → 1024차원 벡터."""
    try:
        res = await client.post(
            f"{settings.ollama_url}/api/embeddings",
            json={"model": settings.embedding_model, "prompt": text},
        )
        res.raise_for_status()
        data = res.json()
        return data.get("embedding", []) or []
    except Exception as e:
        logger.warning("Ollama embeddings 호출 실패: %s", e)
        return []


async def _extract_keywords(client: httpx.AsyncClient, text: str) -> list[str]:
    """LLM 호출로 키워드 5개 추출. 실패/파싱 실패 시 빈 리스트."""
    prompt = (
        "다음 텍스트에서 핵심 키워드 5개를 JSON 배열로만 반환해. "
        "다른 설명·머릿말·코드블록 없이 순수 JSON 배열만.\n\n"
        f"텍스트:\n{text}\n\n"
        "응답 예시: [\"키워드1\", \"키워드2\", \"키워드3\", \"키워드4\", \"키워드5\"]"
    )
    try:
        res = await client.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": settings.llm_model,
                "prompt": prompt,
                "stream": False,
            },
        )
        res.raise_for_status()
        raw = (res.json() or {}).get("response", "")
        return _parse_keywords(raw)
    except Exception as e:
        logger.warning("Ollama 키워드 추출 실패: %s", e)
        return []


def _parse_keywords(raw: str) -> list[str]:
    """LLM 출력에서 JSON 배열을 안전하게 파싱.

    모델이 가끔 ```json ... ``` 또는 부가설명을 붙이므로 첫 '['~마지막 ']'만 잘라낸다.
    """
    if not raw:
        return []
    # 첫 [ 와 마지막 ] 사이를 추출
    m = re.search(r"\[.*\]", raw, flags=re.DOTALL)
    if not m:
        return []
    try:
        parsed = json.loads(m.group(0))
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()][:10]
    except json.JSONDecodeError:
        return []
    return []
