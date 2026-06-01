from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str

    # ── 모델 공급자 ─────────────────────────────────────────────────────────────
    # "prod" = 사내 GPU (Ollama) | "dev" = OpenAI
    model_define: str = "prod"

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

    class Config:
        env_file = ".env.local"
        extra = "ignore"
        protected_namespaces = ()  # model_ 접두사 보호 해제 (model_define 필드 사용)

settings = Settings()
