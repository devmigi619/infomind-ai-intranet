from langgraph.graph import MessagesState


class GraphState(MessagesState):
    user_id: str
    session_id: str
    intent: str | None          # 인텐트 분류 결과
    action_type: str | None     # 행동 분류 결과 (search/excu/human/general)
    context: str | None         # RAG/DB 조회 결과
    actions: list[dict]         # meta 이벤트용 액션 링크
    generated_sql: str | None   # excu/search 노드에서 생성된 일반 SQL
    pending_excu_preview: str | None  # node_excu가 생성한 미리보기 텍스트 (interrupt 간 유지용)
    pending_aprvl_list: list[dict] | None  # 결재자 목록 [{aprvUserId, aprvUserNm, deptNm, jbgdNm}]
    pending_ref_list:   list[dict] | None  # 참조자 목록 (동일 형태)
    pending_req_sn:     int | None         # 사전 확보한 req_sn (interrupt 간 FK 정합성 유지)
    user_embedding: list[float] | None  # node_enrich_context에서 생성한 사용자 메시지 임베딩
    vector_sql: str | None      # generate_sql()이 반환한 벡터 검색 SQL ($1::vector 파라미터)
    grdl_cd: str | None         # 가드레일 key
    grdl_se: str | None         # 가드레일 구분값
    grdl_nm: str | None         # 가드레일 구분값 명
    tk_use_cnt: int             # 토큰 사용값
    system_status: str          # 시스템 상태
    preflight_retry: int        # excu preflight 재시도 횟수 (0=미시도)
