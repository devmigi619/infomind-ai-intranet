APPROVAL_KEYWORDS = {"결재", "승인", "반려", "상신"}
BOARD_KEYWORDS = {"게시", "공지", "글", "게시판"}
WEEKLY_REPORT_KEYWORDS = {"주간", "보고", "주간보고"}

_ACTIONS_MAP: dict[str, list[dict]] = {
    "approval": [{"label": "결재함 바로가기", "target": "approval"}],
    "board": [{"label": "게시판 바로가기", "target": "board"}],
    "weekly_report": [{"label": "주간보고 바로가기", "target": "weeklyReport"}],
    "general": [],
}


def classify_intent(message: str) -> str:
    for keyword in APPROVAL_KEYWORDS:
        if keyword in message:
            return "approval"
    for keyword in WEEKLY_REPORT_KEYWORDS:
        if keyword in message:
            return "weekly_report"
    for keyword in BOARD_KEYWORDS:
        if keyword in message:
            return "board"
    return "general"


def get_actions_for_intent(intent: str) -> list[dict]:
    return _ACTIONS_MAP.get(intent, [])
