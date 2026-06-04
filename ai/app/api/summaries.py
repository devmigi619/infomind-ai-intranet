from fastapi import APIRouter, Depends, HTTPException

from app.hj.core.auth import verify_token
from app.models.summary import SummaryRequest, SummaryResponse
from app.services.summary import summarize

router = APIRouter()


@router.post("/summaries", response_model=SummaryResponse)
async def create_summary(request: SummaryRequest, _user=Depends(verify_token)):
    try:
        return SummaryResponse(summary=await summarize(request.purpose, request.content))
    except Exception as exc:
        raise HTTPException(status_code=502, detail="요약 생성에 실패했습니다.") from exc
