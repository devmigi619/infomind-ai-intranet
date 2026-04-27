from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []  # [{"role": "user"|"assistant", "content": "..."}]


class ActionLink(BaseModel):
    label: str
    target: str  # "approval", "board", "weeklyReport" 등 TabId


class ChatMetadata(BaseModel):
    intent: str  # "approval" | "board" | "weekly_report" | "general"
    actions: list[ActionLink] = []
