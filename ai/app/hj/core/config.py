from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str
    ollama_url: str = "http://ollama:11434"
    qdrant_url: str = "http://qdrant:6333"
    llm_model: str = "gpt-oss:20b"
    slm_model : str = "qwen3:8b"
    tts_model : str = "deepseek-coder-v2:16b"
    embedding_model: str = "bona/bge-m3"
    embedding_dimensions: int = 1024
    allowed_origins: list[str] = ["http://localhost:8081"]
    database_url: str = "http://192.168.0.248:5434"

    class Config:
        env_file = ".env.local"
        extra = "ignore"

settings = Settings()
