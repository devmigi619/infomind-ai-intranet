from pydantic import BaseModel, Field
from typing import Literal


class IntentResult(BaseModel):
    intent: Literal[
        "leave",    # 휴가 관련
        "aprv",     # 전자결재
        "brd",      # 게시판
        "schd",     # 일정
        "veh",      # 차량
        "mtgr",     # 회의실
        "rpt",      # 일간/주간/월간 보고
        "general",  # 그 외
    ]
    action_type: Literal[
        "search",   # 목록/현황 조회 (SQL SELECT)
        "excu",     # 신청/등록/실행 (SQL DML)
        "human",    # 질문이 모호해 재질문 필요
        "general",  # 그 외 일상 대화
    ]
    summary: str = Field(description="의도 한 줄 요약 (내부 로깅용)")


class PreflightResult(BaseModel):
    """excu 실행 전 필요 정보 충족 여부 판단 결과"""
    is_complete: bool = Field(
        description="True=정보 충분 → SQL 생성 가능, False=핵심 값 누락",
    )
    missing_fields: list[str] = Field(
        default=[],
        description="누락된 필드명 목록 (예: ['시작날짜', '종료날짜', '휴가유형'])",
    )
    question: str = Field(
        default="",
        description="누락 정보를 한 번에 묻는 자연어 질문 (is_complete=False 시에만 유효)",
    )
    show_options: list[str] | None = Field(
        default=None,
        description=(
            "missing_fields와 관련된 참조 데이터 선택지. "
            "예: missing_fields=['휴가유형'] → ['연차', '반차(오전)', '반차(오후)', '병가']. "
            "관련 참조 데이터가 없거나 자유 입력 항목이면 null."
        ),
    )


class SqlResult(BaseModel):
    """SQL 생성 결과 — search · excu 공통"""
    sql: str = Field(description="생성된 단일 SQL 문")
    missing_info: list[str] = Field(
        default=[],
        description="정보 부족으로 NULL 또는 임시값이 들어간 필드 목록",
    )
    is_executable: bool = Field(
        default=True,
        description="True=실행 가능, False=핵심 정보 미확보로 실행 불가",
    )


class ReactDecisionResult(BaseModel):
    """ReAct 루프 종료 후 AI의 최종 흐름 의사결정 결과"""
    need_more_info: bool = Field(
        description="사용자에게 추가적인 정보를 더 요구해서 받아야 하는지 여부. 필수 입력 항목(일자, 시간 등)이 모호하거나 누락되었을 때 True"
    )
    more_info_question: str = Field(
        default="",
        description="need_more_info가 True일 때, 사용자에게 추가 정보를 구체적으로 요청하는 친절한 한국어 질문"
    )
    proceed_to_next_node: bool = Field(
        description="다음 노드(실행 node_excu_preflight 또는 조회 node_generate)로 계속 진행해야 하는지 여부. 단순 조회/응답만으로 충분하면 False"
    )
    direct_response: str = Field(
        default="",
        description="proceed_to_next_node가 False일 때, 사용자에게 즉시 리턴할 최종 답변 텍스트"
    )
