"""
LLM 팩토리 — MODEL_DEFINE 환경변수 기반 공급자 추상화

  prod (기본값) : 사내 GPU 서버 Ollama
  dev           : OpenAI API

사용:
    from app.hj.core.llm import get_llm, get_slm, get_structured_slm, get_sql_slm, count_tokens, is_dev
"""

from typing import TypeVar
from pydantic import BaseModel
from langchain_core.language_models import BaseChatModel

from app.hj.core.config import settings

_M = TypeVar("_M", bound=BaseModel)


def is_dev() -> bool:
    """MODEL_DEFINE=dev 이면 True (OpenAI 사용)"""
    return settings.model_define.lower() == "dev"


# ── 기본 LLM ─────────────────────────────────────────────────────────────────

def get_llm(streaming: bool = True) -> BaseChatModel:
    """자유 텍스트 생성용 (node_human 재질문, node_excu 미리보기)"""
    if is_dev():
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_llm_model,
            api_key=settings.openai_api_key,
            streaming=streaming,
        )
    from langchain_ollama import ChatOllama
    return ChatOllama(
        base_url=settings.ollama_url,
        model=settings.llm_model,
        streaming=streaming,
    )


def get_slm(streaming: bool = True) -> BaseChatModel:
    """경량 응답 생성용 (node_generate)"""
    if is_dev():
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_slm_model,
            api_key=settings.openai_api_key,
            streaming=streaming,
        )
    from langchain_ollama import ChatOllama
    return ChatOllama(
        base_url=settings.ollama_url,
        model=settings.slm_model,
        streaming=streaming,
    )


# ── 구조화 출력 LLM ───────────────────────────────────────────────────────────

def get_structured_slm(schema: type[_M], model : str = "ssl"):
    """
    intent 분류 · preflight 검증용 구조화 출력 LLM.

    반환값 차이:
      prod (Ollama) : AIMessage — 호출부에서 parse_llm_json(response.content, Schema) 필요
      dev  (OpenAI) : Pydantic 모델 직접 반환 — 호출부에서 is_dev() 분기 필요
    """
    if is_dev():
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_slm_model,
            api_key=settings.openai_api_key,
        ).with_structured_output(schema)
    from langchain_ollama import ChatOllama
    return ChatOllama(
        base_url=settings.ollama_url,
        model=settings.slm_model,
        format=schema.model_json_schema(),
    )


def get_sql_slm(schema: type[_M]):
    """
    SQL 생성용 구조화 출력 LLM (streaming=False).

    반환값 차이:
      prod (Ollama) : AIMessage — response.content 파싱 필요
      dev  (OpenAI) : Pydantic 모델 직접 반환
    """
    if is_dev():
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_slm_model,
            api_key=settings.openai_api_key,
            streaming=False,
        ).with_structured_output(schema)
    from langchain_ollama import ChatOllama
    return ChatOllama(
        base_url=settings.ollama_url,
        model=settings.slm_model,
        streaming=False,
        format=schema.model_json_schema(),
    )


# ── 토큰 카운팅 ───────────────────────────────────────────────────────────────

def count_tokens(metadata: dict) -> int:
    """
    응답 메타데이터에서 토큰 수 추출.

    Ollama : response_metadata["eval_count"] + ["prompt_eval_count"]
    OpenAI : response_metadata["token_usage"]["total_tokens"]

    dev 모드에서 구조화 출력(with_structured_output) 사용 시 메타데이터가
    없을 수 있으므로 0 폴백 처리.
    """
    if is_dev():
        usage = metadata.get("token_usage") or {}
        return usage.get("total_tokens", 0)
    return metadata.get("eval_count", 0) + metadata.get("prompt_eval_count", 0)
