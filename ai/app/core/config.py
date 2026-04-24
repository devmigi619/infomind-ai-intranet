from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str
    ollama_url: str = "http://ollama:11434"
    qdrant_url: str = "http://qdrant:6333"
    llm_model: str = "qwen2.5:8b"
    embedding_model: str = "bona/bge-m3"
    embedding_dimensions: int = 1024
    allowed_origins: list[str] = ["http://localhost:8081"]

    class Config:
        env_file = ".env"

settings = Settings()
