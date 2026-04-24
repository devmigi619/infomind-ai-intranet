from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.core.auth import verify_token
from app.services.ollama import stream_chat

router = APIRouter()

@router.post("/chat")
async def chat(request: dict, user=Depends(verify_token)):
    return StreamingResponse(
        stream_chat(request.get("message", "")),
        media_type="text/event-stream"
    )
