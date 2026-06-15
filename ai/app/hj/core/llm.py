"""
LLM 팩토리 — MODEL_DEFINE · MODEL_ENV 환경변수 기반 공급자 추상화

  공급자 결정 (우선순위):
    1) MODEL_ENV=LLAMA  → llama.cpp 서버 (OpenAI 호환 /v1 엔드포인트)
    2) MODEL_DEFINE=dev → OpenAI API
    3) 그 외(기본값)     → 사내 GPU 서버 Ollama

  LLAMA 와 dev 는 모두 OpenAI 호환 클라이언트(ChatOpenAI)를 사용하므로
  구조화 출력이 Pydantic 모델을 직접 반환하고, 토큰 사용량도 OpenAI 포맷이다.
  → 호출부는 is_dev() 대신 uses_openai_client() 로 분기한다.

사용:
    from app.hj.core.llm import (
        get_llm, get_slm, get_structured_slm, get_sql_slm,
        count_tokens, is_dev, is_llama, uses_openai_client,
    )
"""

from typing import TypeVar
from pydantic import BaseModel
from langchain_core.language_models import BaseChatModel

from app.hj.core.config import settings

_M = TypeVar("_M", bound=BaseModel)


def is_dev() -> bool:
    """MODEL_DEFINE=dev 이면 True (OpenAI 사용)"""
    return settings.model_define.lower() == "dev"


def is_llama() -> bool:
    """MODEL_ENV=LLAMA 이면 True (llama.cpp 서버 사용)"""
    return settings.model_env.upper() == "LLAMA"


def uses_openai_client() -> bool:
    """
    OpenAI 호환 클라이언트(ChatOpenAI)를 사용하는가.

    True인 경우(dev=OpenAI, llama=llama.cpp):
      - 구조화 출력(with_structured_output)이 Pydantic 모델을 직접 반환
      - 토큰 사용량이 OpenAI 포맷(token_usage)으로 제공
    """
    return is_llama() or is_dev()


def _llama_base_url() -> str:
    """LLAMA_CPP_URL을 OpenAI 호환 base_url(.../v1)로 정규화."""
    url = (settings.llama_cpp_url or "").strip()
    if not url.startswith(("http://", "https://")):
        url = f"http://{url}"
    url = url.rstrip("/")
    if not url.endswith("/v1"):
        url = f"{url}/v1"
    return url


def _llama_chat(streaming: bool) -> BaseChatModel:
    """llama.cpp(OpenAI 호환) ChatOpenAI 인스턴스. api_key는 형식상 더미값."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        base_url=_llama_base_url(),
        api_key="sk-no-key-required",
        model=settings.llama_cpp_model,
        streaming=streaming,
    )


# ── 기본 LLM ─────────────────────────────────────────────────────────────────

def get_llm(streaming: bool = True) -> BaseChatModel:
    """자유 텍스트 생성용 (node_human 재질문, node_excu 미리보기, ReAct 도구 호출)"""
    if is_llama():
        return _llama_chat(streaming)
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
    if is_llama():
        return _llama_chat(streaming)
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

def get_structured_slm(schema: type[_M], model: str = "ssl"):
    """
    intent 분류 · preflight 검증용 구조화 출력 LLM.

    반환값 차이:
      ollama : AIMessage — 호출부에서 parse_llm_json(response.content, Schema) 필요
      openai 호환(dev/llama) : Pydantic 모델 직접 반환 — uses_openai_client() 분기 필요
    """
    if is_llama():
        return _llama_chat(streaming=False).with_structured_output(schema)
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
        format=schema.model_json_schema(),
        streaming=False,
    )


def get_sql_slm(schema: type[_M]):
    """
    SQL 생성용 구조화 출력 LLM (streaming=False).

    반환값 차이:
      ollama : AIMessage — response.content 파싱 필요
      openai 호환(dev/llama) : Pydantic 모델 직접 반환
    """
    if is_llama():
        return _llama_chat(streaming=False).with_structured_output(schema)
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

    Ollama       : response_metadata["eval_count"] + ["prompt_eval_count"]
    OpenAI 호환  : response_metadata["token_usage"]["total_tokens"] (dev · llama)

    구조화 출력(with_structured_output) 사용 시 메타데이터가 없을 수 있으므로
    0 폴백 처리.
    """
    if uses_openai_client():
        usage = metadata.get("token_usage") or {}
        return usage.get("total_tokens", 0)
    return metadata.get("eval_count", 0) + metadata.get("prompt_eval_count", 0)
