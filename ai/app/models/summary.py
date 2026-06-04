from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    purpose: str = Field(min_length=1)
    content: str = Field(min_length=1)


class SummaryResponse(BaseModel):
    summary: str
