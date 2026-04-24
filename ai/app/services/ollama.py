import httpx
from app.core.config import settings

async def stream_chat(message: str):
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream("POST", f"{settings.ollama_url}/api/generate", json={
            "model": "qwen2.5:8b",
            "prompt": message,
            "stream": True,
        }) as response:
            async for chunk in response.aiter_text():
                yield f"data: {chunk}\n\n"
