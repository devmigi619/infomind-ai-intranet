from dotenv import load_dotenv

# LangSmith 등 os.environ 의존 라이브러리보다 먼저 로드해야 한다.
load_dotenv(".env.local")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.hj.core.config import settings
# from app.api import chat, files, health
from app.api import health, summaries
from app.hj.api import chat

app = FastAPI(title="Infomind AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(summaries.router, prefix="/ai")
# app.include_router(chat.router, prefix="/ai")
# app.include_router(files.router, prefix="/ai")
app.include_router(chat.router, prefix="/ai")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
