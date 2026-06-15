from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str

    # ── 모델 공급자 ─────────────────────────────────────────────────────────────
    # "prod" = 사내 GPU (Ollama) | "dev" = OpenAI
    model_define: str = "prod"

    # ── 모델 서빙 ───────────────────────────────────────────────────────────────
    # "OLLAMA" = 사내 GPU 서버(Ollama) | "LLAMA" = llama.cpp 서버(OpenAI 호환 /v1)
    # LLAMA 일 때 hj 챗봇 LLM 호출만 llama.cpp로 라우팅된다.
    # (임베딩·가드레일은 LLAMA 여부와 무관하게 항상 Ollama 사용)
    model_env: str = "OLLAMA"

    # ── llama.cpp (model_env=LLAMA) ─────────────────────────────────────────────
    # URL은 스킴/포트 포함 (예: "100.127.96.11:8080"). /v1 은 자동 부착.
    llama_cpp_url: str = "http://localhost:8080"
    llama_cpp_model: str = ""

    # ── Ollama (prod) ───────────────────────────────────────────────────────────
    ollama_url: str = "http://ollama:11434"
    llm_model: str = "gpt-oss:20b"
    slm_model: str = "qwen3:8b"
    tts_model: str = "deepseek-coder-v2:16b"
    embedding_model: str = "bona/bge-m3"
    embedding_dimensions: int = 1024

    # ── OpenAI (dev) ────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_llm_model: str = "gpt-4o-mini"
    openai_slm_model: str = "gpt-4o-mini"

    # ── 공통 ────────────────────────────────────────────────────────────────────
    qdrant_url: str = "http://qdrant:6333"
    allowed_origins: list[str] = ["http://localhost:8081"]
    database_url: str = "http://192.168.0.248:5434"
    ai_context_enabled: bool = True

    class Config:
        env_file = ".env.local"
        extra = "ignore"
        protected_namespaces = ()  # model_ 접두사 보호 해제 (model_define 필드 사용)

settings = Settings()
