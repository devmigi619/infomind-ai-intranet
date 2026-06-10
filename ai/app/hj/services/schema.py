# intent별 관련 테이블 스키마 — 개발자가 테이블 확정 후 여기에만 추가한다.
#
# 작성 형식:
#   -- 테이블명: 용도 | PK: 컬럼 | FK: 컬럼 → 참조테이블.컬럼
#   -- 컬럼: 컬럼명(타입), 코드컬럼(VARCHAR: 'A'=설명 'B'=설명), 날짜컬럼(DATE or TIMESTAMP)
#
# 생략: DEFAULT, NOT NULL, 인덱스, 트리거

# ── 공통 테이블 ───────────────────────────────────────────────────────────────
# 모든 intent에서 항상 SQL 프롬프트에 포함된다.
# int_user를 각 intent에 중복 정의하지 말 것 — 여기에서 통합 관리.

COMMON_TABLES: list[str] = [
    # 사용자 — 전체 컬럼 (부서·직급 FK 포함)
    "-- int_user: 사용자 | PK: user_id | FK: jbgd_cd → int_jbgd.jbgd_cd, dept_cd → int_dept.dept_cd\n"
    " 컬럼: user_id(VARCHAR 사용자 아이디), user_nm(VARCHAR 사용자 이름), jbgd_cd(VARCHAR 직급코드), dept_cd(VARCHAR 부서코드),\n"
    "        hire_ymd(VARCHAR(8) YYYYMMDD 입사일), resg_ymd(VARCHAR(8) YYYYMMDD 퇴사일 NULL=재직중),\n"
    "        user_se(VARCHAR 사용자 구분 코드)",

    # 부서 마스터 — 부서명 조회, 조직도 계층 JOIN 시 필수
    "-- int_dept: 부서 마스터 | PK: dept_cd | FK: up_dept_cd → int_dept.dept_cd (자기참조 계층)\n"
    " 컬럼: dept_cd(VARCHAR 부서코드), dept_nm(VARCHAR 부서명), up_dept_cd(VARCHAR 상위부서코드),\n"
    "        dept_lvl(INT 레벨 최상위=1), use_yn(VARCHAR: 'Y'/'N')\n"
    " 사용 예: JOIN int_dept d ON u.dept_cd = d.dept_cd",

    # 직급 마스터 — 직급명 조회 시 필수
    "-- int_jbgd: 직급 마스터 | PK: jbgd_cd\n"
    " 컬럼: jbgd_cd(VARCHAR 직급코드), jbgd_nm(VARCHAR 직급명), jbgd_sn(INT 정렬순서 낮을수록 상위), use_yn(VARCHAR: 'Y'/'N')\n"
    " 사용 예: JOIN int_jbgd j ON u.jbgd_cd = j.jbgd_cd",

    # 공통코드 마스터 + f_cm_cd 함수
    "-- int_com_code: 공통코드 마스터 | PK: (up_cd, cd)\n"
    " 컬럼: up_cd(VARCHAR 코드그룹명=컬럼명과 동일), cd(VARCHAR 코드값), cd_nm(VARCHAR 코드명),\n"
    "        use_yn(VARCHAR: 'Y'/'N'), cd_ord(INT 정렬순서)\n"
    " 함수: f_cm_cd(p_up_cd VARCHAR, p_cd VARCHAR) → VARCHAR  [인자 반드시 2개]\n"
    "        USE_YN='Y' AND UP_CD=p_up_cd AND CD=p_cd인 CD_NM 반환. 매칭 없으면 NULL.\n"
    "-- [_SE 컬럼 규칙] 모든 _SE 접미사 컬럼은 f_cm_cd('컬럼명대문자', 값) AS 컬럼명_nm 로 조회\n"
    "   인자 2개 고정(3개 금지). 따옴표 단일 따옴표만 사용('' 금지)\n"
    "   예) t.user_se → f_cm_cd('USER_SE', t.user_se) AS user_se_nm\n"
    "   예) t.gndr_se → f_cm_cd('GNDR_SE', t.gndr_se) AS gndr_se_nm\n"
    "   각 컬럼의 up_cd는 해당 컬럼 설명의 → f_cm_cd('UP_CD') 표기를 참고",
]

# ── intent별 전용 테이블 ──────────────────────────────────────────────────────
# int_user는 COMMON_TABLES로 이동 — 각 intent에 중복 정의 금지.

INTENT_SCHEMAS: dict[str, list[str]] = {
    "leave": [
        # 휴가신청 마스터
        "-- int_leave_req_mst: 휴가신청 마스터 | PK: (req_user_id, req_sn)\n"
        "   FK(물리): (leave_cd, leave_dtl_cd) → int_leave_dtl(leave_cd, leave_dtl_cd) [복합 FK — 두 값이 한 쌍으로 존재해야 함]\n"
        "   JOIN 힌트: req_user_id ↔ int_user.user_id, leave_cd ↔ int_leave_mst.leave_cd\n"
        " 컬럼: req_user_id(VARCHAR 신청자ID), req_sn(BIGINT 자동증가), leave_rsn(VARCHAR 사유),\n"
        "        aprv_rslt_se(VARCHAR → f_cm_cd('APRV_RSLT_SE')),\n"
        "        leave_cd(VARCHAR 휴가코드), leave_dtl_cd(VARCHAR 휴가 상세 코드), leave_use_dcnt(NUMERIC 사용일수),\n"
        "        afile_id(VARCHAR 첨부파일그룹ID NULL 허용), dept_ref_yn(VARCHAR: 'Y'/'N')\n"
        "   [INSERT 주의] leave_cd·leave_dtl_cd는 int_leave_dtl에 함께 존재하는 쌍만 허용 (참조코드의 leave_cd= 표기 참고)",

        # 휴가신청 일별 상세
        "-- int_leave_req_dtl: 휴가신청 일별 상세 | PK: (req_user_id, req_sn, leave_use_ymd) | FK: (req_user_id, req_sn) → int_leave_req_mst\n"
        " 컬럼: leave_use_ymd(VARCHAR(8) YYYYMMDD 사용날짜), leave_st_hhmm(VARCHAR(4) HHMM 시작시간), leave_end_hhmm(VARCHAR(4) HHMM 종료시간)\n"
        " ※ 위 3개(+감사컬럼)가 전부 — leave_use_dcnt·leave_cd 등은 이 테이블에 없음(마스터 소속)\n"
        " 날짜 비교: TO_DATE(leave_use_ymd, 'YYYYMMDD')",

        # 결재라인
        "-- int_leave_req_aprv: 휴가결재라인 | PK: (req_user_id, req_sn, aprv_user_id) | FK: (req_user_id, req_sn) → int_leave_req_mst\n"
        " 컬럼: aprv_user_id(VARCHAR 결재자ID), aprv_se(VARCHAR → f_cm_cd('APRV_SE')),\n"
        "        aprv_ymd(VARCHAR(8) YYYYMMDD 결재일), aprv_ord(BIGINT 결재순서), rmk(TEXT 의견 또는 반려사유)",

        # 휴가유형 마스터
        "-- int_leave_mst: 휴가유형 마스터 | PK: leave_cd\n"
        " 컬럼: leave_cd(VARCHAR 휴가코드),\n"
        "        leave_nm(VARCHAR 휴가이름), ded_yn(VARCHAR: 'Y'=연차차감 'N'=미차감), paid_yn(VARCHAR: 'Y'=유급 'N'=무급)",

        # 휴가유형 상세
        "-- int_leave_dtl: 휴가유형 상세 | PK: (leave_cd, leave_dtl_cd) | FK: leave_cd → int_leave_mst.leave_cd\n"
        " 컬럼: leave_dtl_cd(VARCHAR 휴가 상세 코드), leave_dtl_nm(VARCHAR 휴가 상세명), leave_se(VARCHAR → f_cm_cd('LEAVE_SE') F=종일 H=부분),\n"
        "        use_avl_dcnt(NUMERIC 사용가능일수 NULL이면 무제한), use_yn(VARCHAR: 'Y'/'N')",

        # 연차정책 + f_leave_calc 함수
        "-- int_leave_pol: 연차정책 | PK: leave_pol_cd\n"
        " 컬럼: pol_st_mon(INT 적용시작근속월), pol_end_mon(INT 적용종료근속월),\n"
        "        leave_dcnt(NUMERIC 기본연차일수), add_dcnt(NUMERIC 추가일수), add_cyc_mon(INT 추가주기월), max_dcnt(NUMERIC 최대일수)\n"
        " 함수: f_leave_calc(p_user_id VARCHAR) → NUMERIC  -- 입사일 기반 부여 연차일수 반환\n"
        "-- 잔여연차 계산 예시:\n"
        "   SELECT f_leave_calc('user01')\n"
        "          - COALESCE((SELECT SUM(leave_use_dcnt) FROM int_leave_req_mst\n"
        "                      WHERE req_user_id='user01' AND leave_cd='LEAVE_00001'\n"
        "                        AND aprv_rslt_se IN ('1','2','3')), 0) AS remain_dcnt",

        # 참조자
        "-- int_leave_req_ref: 휴가신청 참조자 | PK: (req_user_id, req_sn, ref_user_id) | FK: (req_user_id, req_sn) → int_leave_req_mst\n"
        " 컬럼: ref_user_id(VARCHAR 참조자ID), qry_yn(VARCHAR: 'Y'=조회함 'N'=미조회)",

        # 휴가신청 INSERT 비즈니스 규칙
        "-- [INSERT 규칙] 휴가신청 SQL은 마스터(int_leave_req_mst) + 일별상세(int_leave_req_dtl) 2개 테이블만 생성. 컬럼을 테이블 간 섞지 말 것\n"
        "   ★ int_leave_req_aprv(결재라인)·int_leave_req_ref(참조자) INSERT는 절대 생성하지 말 것 — 사용자 결재선 확정 후 시스템이 자동 삽입함\n"
        " · int_leave_req_mst (1행) — 컬럼: req_user_id, req_sn, leave_cd, leave_dtl_cd, leave_rsn, aprv_rslt_se, leave_use_dcnt(+감사컬럼)\n"
        "    - leave_cd·leave_dtl_cd: [참조 코드]에서 같은 쌍 선택 (예: 연차 종일 → LEAVE_00001 + LEAVE_00011 / 연차 반차 → LEAVE_00001 + LEAVE_00021)\n"
        "    - leave_rsn: 미입력 시 '개인 사정으로 휴가 신청합니다'\n"
        "    - aprv_rslt_se: 신규 신청은 '1'(신청)\n"
        "    - leave_use_dcnt(※마스터 전용 컬럼): 종일=1.0, 반차=0.5, 시간단위=(종료-시작)시간/8\n"
        " · int_leave_req_dtl (신청일 수만큼 N행) — 컬럼은 leave_use_ymd, leave_st_hhmm, leave_end_hhmm 이 전부(+감사컬럼)\n"
        "    - leave_use_dcnt·leave_cd 등 다른 컬럼은 이 테이블에 존재하지 않으니 절대 넣지 말 것\n"
        "    - 신청 기간의 날짜별로 1행씩, 단일 날짜면 1행. 시간은 반차 등 시간단위에만 입력하고 종일이면 NULL\n"
        " · req_sn: 컨텍스트의 [요청 시퀀스] 값을 마스터·상세에 동일하게 사용(서브쿼리 금지)",
    ],
    "aprv": [
        # 결재 양식 마스터
        "-- int_aprv_form_mst: 결재 양식 마스터 | PK: aprv_form_id\n"
        " 컬럼: aprv_form_nm(VARCHAR 양식명), file_yn(VARCHAR: 'Y'/'N' 파일첨부가능), rmk(TEXT 비고), del_yn(VARCHAR: 'Y'/'N')",

        # 결재 양식 항목 (EAV 패턴)
        "-- int_aprv_form_dtl: 결재 양식 항목 | PK: (aprv_form_id, aprv_ref_cd) | FK: aprv_form_id → int_aprv_form_mst\n"
        " 컬럼: aprv_ref_nm(VARCHAR 항목명), aprv_ref_se(VARCHAR 항목구분/타입), reqd_yn(VARCHAR: 'Y'=필수 'N'=선택), del_yn(VARCHAR: 'Y'/'N')\n"
        " 용도: 양식별 입력 항목 정의 (EAV 패턴) — reqd_yn='Y' 항목이 사용자 필수 입력값",

        # 결재 요청
        "-- int_aprv_req: 결재 요청 | PK: (aprv_form_id, req_user_id, aprv_req_sn) | FK: aprv_form_id → int_aprv_form_mst\n"
        " 컬럼: aprv_req_desc(JSONB 양식 항목값 {aprv_ref_cd: 입력값}),\n"
        "        aprv_rslt_se(VARCHAR → f_cm_cd('APRV_RSLT_SE') 결재결과),\n"
        "        req_sum(TEXT 요약/제목), req_ymd(VARCHAR(8) YYYYMMDD 요청일),\n"
        "        afile_id(VARCHAR 첨부파일그룹ID NULL허용), dept_ref_yn(VARCHAR: 'Y'/'N'), del_yn(VARCHAR: 'Y'/'N')\n"
        " [JSONB 예시] aprv_req_desc = '{\"ref001\": \"출장 목적\", \"ref002\": \"20250610\"}'::jsonb",

        # 결재자 (시스템 자동 삽입)
        "-- int_aprv_req_aprv: 결재자 | PK: (aprv_form_id, req_user_id, aprv_req_sn, aprv_user_id)\n"
        " FK: (aprv_form_id, req_user_id, aprv_req_sn) → int_aprv_req\n"
        " 컬럼: aprv_ord(BIGINT 결재순서), aprv_se(VARCHAR → f_cm_cd('APRV_SE') NULL=미처리),\n"
        "        aprv_ymd(VARCHAR(8) YYYYMMDD 결재일), rmk(TEXT 의견/반려사유)",

        # 참조자 (시스템 자동 삽입)
        "-- int_aprv_req_ref: 참조자 | PK: (aprv_form_id, req_user_id, aprv_req_sn, ref_user_id)\n"
        " FK: (aprv_form_id, req_user_id, aprv_req_sn) → int_aprv_req\n"
        " 컬럼: qry_yn(VARCHAR: 'Y'=조회함 'N'=미조회)",

        # INSERT 규칙
        "-- [INSERT 규칙] 결재신청 SQL은 int_aprv_req 1개 테이블만 생성\n"
        "   ★ int_aprv_req_aprv(결재라인)·int_aprv_req_ref(참조자) INSERT는 절대 생성하지 말 것 — 사용자 결재선 확정 후 시스템이 자동 삽입함\n"
        " · int_aprv_req (1행) — 컬럼: aprv_form_id, req_user_id, aprv_req_sn, aprv_req_desc, aprv_rslt_se, req_sum, req_ymd(+감사컬럼)\n"
        "    - aprv_req_desc: JSONB 캐스트 필수 — '{\"aprv_ref_cd\": \"입력값\", ...}'::jsonb\n"
        "    - aprv_rslt_se: 신규 신청은 '1'(신청)\n"
        "    - req_sum: 결재신청 내용을 한 줄 요약 — 양식명 + 핵심 항목값 조합\n"
        "               (예: '품의서 - OO 사유 신청', '출장신청서 - 2025-06-10 서울 출장')\n"
        "    - req_ymd: 오늘 날짜 YYYYMMDD\n"
        " · aprv_req_sn: 컨텍스트의 [요청 시퀀스] 값을 직접 사용(서브쿼리 금지)",
    ],
    "brd": [
        # 게시판 마스터
        "-- int_brd: 게시판 마스터 | PK: brd_id\n"
        " 컬럼: brd_id(VARCHAR 게시판 아이디),\n"
        "        brd_se(VARCHAR → f_cm_cd('BRD_SE')), brd_nm(VARCHAR 게시판명),\n"
        "        file_use_yn(VARCHAR: 'Y'/'N' 첨부파일사용), cmt_use_yn(VARCHAR: 'Y'/'N' 댓글사용), use_yn(VARCHAR: 'Y'/'N')",

        # 게시글
        "-- int_pst: 게시글 | PK: (brd_id, pst_sn) | FK: brd_id → int_brd.brd_id, user_id → int_user.user_id, afile_id → int_com_file_grp.afile_id\n"
        " 컬럼: brd_id(VARCHAR 게시판 아이디), pst_sn(BIGINT 자동증가), pst_ttl(VARCHAR 제목), pst_desc(TEXT 본문),\n"
        "        user_id(VARCHAR 작성자), ntc_yn(VARCHAR: 'Y'=공지글 'N'=일반글),\n"
        "        del_yn(VARCHAR: 'Y'=삭제 'N'=정상 — 조회 시 del_yn='N' 조건 필수),\n"
        "        qry_cnt(INT 조회수), like_num(INT 좋아요수),\n"
        "        pub_st_ymd(VARCHAR(8) YYYYMMDD 게시시작일), pub_end_ymd(VARCHAR(8) YYYYMMDD 게시종료일),\n"
        "        afile_id(VARCHAR 첨부파일그룹ID), crt_at(TIMESTAMP)\n"
        " 날짜 비교: TO_DATE(pub_st_ymd, 'YYYYMMDD')",

        # 댓글
        "-- int_pst_cmt: 게시글 댓글 | PK: (pst_sn, brd_id, cmt_sn) | FK(물리): (brd_id, pst_sn) → int_pst | JOIN 힌트: user_id ↔ int_user.user_id\n"
        " 컬럼: cmt_sn(INT 댓글번호), cmt_lvl(INT: 1=댓글 2=대댓글), up_cmt_sn(INT 부모댓글번호 대댓글일 때),\n"
        "        cmt_desc(TEXT 내용), user_id(VARCHAR 작성자),\n"
        "        del_yn(VARCHAR: 'Y'=삭제 'N'=정상 — 조회 시 del_yn='N' 조건 필수), like_cnt(INT 좋아요수)",

        # 파일 그룹
        "-- int_com_file_grp: 파일 그룹 | PK: afile_id\n"
        " 용도: 첨부파일 묶음 식별자. int_pst.afile_id → int_com_file_grp.afile_id",

        # 파일 목록
        "-- int_com_file: 파일 목록 | PK: (afile_id, afile_sn) | FK: afile_id → int_com_file_grp.afile_id\n"
        " 컬럼: afile_sn(BIGINT 파일순번), ori_file_nm(VARCHAR 원본파일명), file_nm(VARCHAR 저장파일명),\n"
        "        file_ext(VARCHAR 확장자), file_sz(NUMERIC 파일크기bytes),\n"
        "        rep_file_yn(VARCHAR: 'Y'=대표파일 'N'=일반), del_yn(VARCHAR: 'Y'/'N')",

        # 파일 임베딩 (벡터 검색)
        "-- int_com_file_emb: 파일 임베딩 (RAG 벡터 검색) | PK: (afile_id, afile_sn, emb_id) | FK: (afile_id, afile_sn) → int_com_file\n"
        " 컬럼: emb_id(VARCHAR 청크ID), emb_rslt(vector(1024) bge-m3 임베딩),\n"
        "        emb_ttl(VARCHAR 청크 제목/요약), ori_desc(TEXT 원본 텍스트 청크), tag_rslt(JSONB 태그)\n"
        "-- 벡터 검색 예시 (파라미터로 임베딩 벡터 $1 전달):\n"
        "   SELECT emb_ttl, ori_desc, 1-(emb_rslt <=> $1::vector) AS similarity\n"
        "   FROM int_com_file_emb\n"
        "   WHERE 1-(emb_rslt <=> $1::vector) >= 0.7\n"
        "   ORDER BY similarity DESC LIMIT 5",

        # 게시글/댓글 INSERT 규칙
        "-- [INSERT 규칙]\n"
        " 1. pst_sn: (SELECT COALESCE(MAX(pst_sn),0)+1 FROM int_pst WHERE brd_id='대상게시판ID') 서브쿼리로 설정\n"
        " 2. cmt_sn: (SELECT COALESCE(MAX(cmt_sn),0)+1 FROM int_pst_cmt WHERE brd_id='대상게시판ID' AND pst_sn=대상게시글번호) 서브쿼리로 설정",
    ],
    "schd": [
        # 일정 마스터
        "-- int_schd: 일정 마스터 | PK: schd_sn(BIGINT 자동증가)\n"
        " 컬럼: user_id(작성자 FK→int_user), dept_cd(NULL=전사 공통 FK→int_dept),\n"
        "        schd_nm(일정명), rmk(상세내용),\n"
        "        schd_st_ymd(VARCHAR(8) YYYYMMDD 시작일), schd_st_hr(VARCHAR(4) HHMM 시작시간 NULL=종일),\n"
        "        schd_end_ymd(VARCHAR(8) YYYYMMDD 종료일), schd_end_hr(VARCHAR(4) HHMM 종료시간 NULL=종일),\n"
        "        loop_yn('Y'=반복 'N'=단일), loop_se(VARCHAR → f_cm_cd('LOOP_SE') DAY=매일 WEEK=매주 MONTH=매월 YEAR=매년, loop_yn='Y'일 때만 유효)\n"
        " [반복 일정] schd_end_ymd는 각 발생 건의 기간(길이)이며 반복 종료일이 아님. 반복 종료는 int_schd_excp.end_yn='Y'로 제어",

        # 반복 일정 예외
        "-- int_schd_excp: 반복 일정 예외 | PK: (schd_sn, excp_ymd) | FK: schd_sn → int_schd\n"
        " 컬럼: end_yn('N'=해당일만 건너뜀 'Y'=해당일 이후 반복 전체 종료)",

        # 참석자
        "-- int_schd_attd: 일정 참석자 | PK: (schd_sn, attd_user_id) | FK: schd_sn → int_schd, attd_user_id → int_user\n"
        " 컬럼: user_attd_yn('Y'=참석 'N'=불참 default='N'), user_qry_yn('Y'=확인 'N'=미확인 default='N')",

        # DB 함수
        "-- [DB 함수] 일정 조회 시 아래 함수를 우선 사용할 것 (반복 일정 발생일 자동 처리)\n"
        "-- F_LOOP_SCHD_CALC(p_schd_sn BIGINT, p_from_ymd VARCHAR(8), p_to_ymd VARCHAR(8))\n"
        "--   반환: TABLE(occur_st_ymd VARCHAR(8), occur_end_ymd VARCHAR(8))\n"
        "--   반복 일정 1건의 실제 발생일을 조회 범위 내에서 전개. int_schd_excp 예외 자동 반영\n"
        "-- F_SCHD_QRY(p_user_id VARCHAR, p_dept_cd VARCHAR, p_from_ymd VARCHAR(8), p_to_ymd VARCHAR(8))\n"
        "--   반환: TABLE(schd_sn, schd_nm, occur_st_ymd, occur_end_ymd, schd_st_hr, schd_end_hr,\n"
        "--               loop_yn, loop_se, writer_id, dept_cd, rmk, user_attd_yn)\n"
        "--   단일+반복 일정 통합 조회. 참석자 등록 일정 + 전사 공통(dept_cd IS NULL) + 소속 부서 일정 포함\n"
        "--   사용 예: SELECT * FROM F_SCHD_QRY('{user_id}', '{dept_cd}', '20250601', '20250630')",

        # 일정 INSERT 규칙
        "-- [INSERT 규칙]\n"
        " 1. 날짜: '내일', '다음주 월요일' 등 단일 날짜 표현이면 schd_st_ymd = schd_end_ymd (같은 날)\n"
        " 2. schd_sn: (SELECT COALESCE(MAX(schd_sn),0)+1 FROM int_schd) 서브쿼리로 설정",
    ],
    "veh": [
        # 차량 마스터
        "-- int_veh: 차량 마스터 | PK: veh_id\n"
        " 컬럼: veh_id(VARCHAR 차량 아이디), veh_nm(VARCHAR 차량명), veh_no(VARCHAR 차량번호),\n"
        "        veh_se(VARCHAR → f_cm_cd('VEH_SE')), dept_cd(VARCHAR 차량 사용 부서코드), use_yn(VARCHAR: 'Y'/'N')",

        # 차량 예약
        "-- int_veh_rsv: 차량예약 | PK: (veh_id, rsv_sn) | FK: veh_id → int_veh.veh_id, user_id → int_user.user_id\n"
        " 컬럼: rsv_sn(BIGINT 자동증가), user_id(VARCHAR 예약자),\n"
        "        rsv_st_ymd(VARCHAR(8) YYYYMMDD 예약시작일), rsv_st_hhmm(VARCHAR(4) HHMM 시작시간),\n"
        "        rsv_end_ymd(VARCHAR(8) YYYYMMDD 예약종료일), rsv_end_hhmm(VARCHAR(4) HHMM 종료시간),\n"
        "        ext_yn(VARCHAR: 'Y'=연장 'N'=미연장), ext_ymd(VARCHAR(8) YYYYMMDD 연장일), ext_hhmm(VARCHAR(4) HHMM 연장시간),\n"
        "        rtn_yn(VARCHAR: 'Y'=반납완료 'N'=미반납), rtn_ymd(VARCHAR(8) YYYYMMDD 반납일), rtn_hhmm(VARCHAR(4) HHMM 반납시간), rtn_plc(TEXT 반납장소),\n"
        "        rmk(TEXT 비고)\n"
        "-- 날짜 비교: TO_DATE(rsv_st_ymd, 'YYYYMMDD')\n"
        "-- DML: 본인 예약만 허용 (user_id 조건 필수)\n"
        "-- [INSERT 규칙] rsv_sn: (SELECT COALESCE(MAX(rsv_sn),0)+1 FROM int_veh_rsv WHERE veh_id='선택차량ID') 서브쿼리로 설정",
    ],
    "mtgr": [
        # 회의실 마스터
        "-- int_mtgr: 회의실 마스터 | PK: mtgr_id\n"
        " 컬럼: mtgr_id(VARCHAR 회의실 아이디), mtgr_nm(VARCHAR 회의실명), mtgr_plc(VARCHAR 위치),\n"
        "        mtgr_se(VARCHAR → f_cm_cd('MTGR_SE')), dept_cd(VARCHAR 회의실 사용 부서코드), use_yn(VARCHAR: 'Y'/'N')",

        # 회의실 예약
        "-- int_mtgr_rsv: 회의실예약 | PK: (mtgr_id, rsv_sn) | FK: mtgr_id → int_mtgr.mtgr_id, user_id → int_user.user_id\n"
        " 컬럼: rsv_sn(BIGINT 자동증가), user_id(VARCHAR 예약자),\n"
        "        rsv_st_ymd(VARCHAR(8) YYYYMMDD 예약시작일), rsv_st_hhmm(VARCHAR(4) HHMM 시작시간),\n"
        "        rsv_end_ymd(VARCHAR(8) YYYYMMDD 예약종료일), rsv_end_hhmm(VARCHAR(4) HHMM 종료시간),\n"
        "        ext_yn(VARCHAR: 'Y'=연장 'N'=미연장), ext_ymd(VARCHAR(8) YYYYMMDD 연장일), ext_hhmm(VARCHAR(4) HHMM 연장시간),\n"
        "        rmk(TEXT 비고)\n"
        "-- 날짜 비교: TO_DATE(rsv_st_ymd, 'YYYYMMDD')\n"
        "-- 중복 예약 확인: rsv_st_ymd/hhmm ~ rsv_end_ymd/hhmm 범위 겹침 여부 체크 필수\n"
        "-- DML: 본인 예약만 허용 (user_id 조건 필수)\n"
        "-- [INSERT 규칙] rsv_sn: (SELECT COALESCE(MAX(rsv_sn),0)+1 FROM int_mtgr_rsv WHERE mtgr_id='선택회의실ID') 서브쿼리로 설정",
    ],
    "rpt": [
        # 보고 양식 마스터
        "-- int_rpt_form: 보고 양식 마스터 | PK: rpt_form_id | FK: dept_cd → int_dept.dept_cd, rpt_adm_id → int_user.user_id\n"
        " 컬럼: rpt_form_id(VARCHAR 양식 ID 예:RPT_001), rpt_ttl(VARCHAR 양식 제목 예:주간보고), rpt_desc(TEXT 양식 설명),\n"
        "        rpt_dt_se(VARCHAR 보고주기: 'DAILY'=일간 'WEEKLY'=주간 'MONTHLY'=월간),\n"
        "        rpt_adm_id(VARCHAR 양식 관리자 user_id — 회차 등록/수정/삭제 권한 보유),\n"
        "        st_ymd(VARCHAR(8) YYYYMMDD 양식 시작일), dept_cd(VARCHAR 부서코드),\n"
        "        open_yn(VARCHAR: 'Y'=공개 'N'=비공개), use_yn(VARCHAR: 'Y'/'N'), rmk(TEXT 비고)",

        # 보고 회차
        "-- int_rpt_round: 보고 회차 | PK: (rpt_form_id, round_sn) | FK: rpt_form_id → int_rpt_form.rpt_form_id\n"
        " 컬럼: round_sn(BIGINT 자동증가), round_nm(TEXT 회차명 예:1회차·2회차),\n"
        "        round_ymd(VARCHAR(8) YYYYMMDD 회차 기준 날짜), rpt_sum(TEXT 회차 전체 요약 — 관리자 작성)\n"
        " [권한] INSERT/UPDATE/DELETE: 해당 양식의 rpt_adm_id = 요청 user_id 인 경우만 허용\n"
        " JOIN 힌트: rpt_form_id ↔ int_rpt_form.rpt_form_id",

        # 업무보고 내용
        "-- int_rpt_desc: 업무보고 내용 | PK: (rpt_form_id, round_sn, user_id)\n"
        " FK: (rpt_form_id, round_sn) → int_rpt_round\n"
        " 컬럼: user_id(VARCHAR 작성자 FK→int_user), exec_desc(TEXT 수행 업무 내용 — 이번 기간 한 일),\n"
        "        plan_desc(TEXT 계획 업무 내용 — 다음 기간 할 일),\n"
        "        sbmt_yn(VARCHAR: 'Y'=제출완료 'N'=미제출 — 제출완료 건 수정/삭제 금지),\n"
        "        sbmt_ymd(VARCHAR(8) YYYYMMDD 제출 일자)\n"
        " [권한] UPDATE/DELETE: WHERE user_id=요청user_id AND sbmt_yn='N' 조건 필수\n"
        "         타인 보고 수정/삭제 금지 / 제출완료(sbmt_yn='Y') 건 변경 금지\n"
        " [권한] SELECT: user_id 조건 없이 전체 조회 가능 (open_yn='Y' 양식 기준)",

        # DML 규칙 (작성/수정 통합)
        "-- [DML 규칙] 업무보고(int_rpt_desc) 작성·수정\n"
        " [react 조회 힌트] 작성·수정 요청 시 반드시 아래 전체 조회:\n"
        "   SELECT exec_desc, plan_desc, sbmt_yn FROM int_rpt_desc\n"
        "   WHERE rpt_form_id=확정값 AND round_sn=확정값 AND user_id=요청user_id\n"
        " ▶ 조회 결과 있음 → UPDATE (기존 레코드 덮어쓰기)\n"
        "   UPDATE int_rpt_desc\n"
        "   SET exec_desc=NULL, plan_desc=NULL, sbmt_yn='N'\n"
        "   WHERE rpt_form_id=? AND round_sn=? AND user_id=요청user_id AND sbmt_yn='N'\n"
        " ▶ 조회 결과 없음 → INSERT (신규 작성)\n"
        "   INSERT INTO int_rpt_desc (rpt_form_id, round_sn, user_id, exec_desc, plan_desc, sbmt_yn)\n"
        "   VALUES (?, ?, 요청user_id, NULL, NULL, 'N')\n"
        " ※ exec_desc·plan_desc·sbmt_yn → NULL/'N'으로 두면 폼 패널 입력값이 자동 주입됨\n"
        " · round_sn: [참조 코드] 확정값 사용. 없으면\n"
        "   (SELECT COALESCE(MAX(round_sn),0)+1 FROM int_rpt_round WHERE rpt_form_id=?)\n"
        " · 회차(int_rpt_round) INSERT: 관리자만. 컬럼 rpt_form_id·round_sn·round_nm·round_ymd",
    ],
    "general": [
        # 일반 대화 — 보통 DB 조회 불필요
    ],
}


# ── 경량(lookup) 스키마 변환 ──────────────────────────────────────────────────
# ReAct 조회 루프(node_react_gather)는 "레코드 찾기"만 수행하므로
# INSERT 규칙·예시 SQL·f_cm_cd 사용규칙 등 SQL 생성 전용 내용이 필요 없다.
# 토큰 절감을 위해 테이블 헤더·컬럼·키(FK/JOIN/PK)·함수 시그니처만 남긴다.
#
#   - "-- [INSERT 규칙]" 으로 시작하는 항목은 통째로 제거
#   - 항목 내 예시/사용예/규칙 블록은 다음 구조 라인(헤더/컬럼/키/함수)까지 건너뜀
#   - ※ 주석(테이블 경계 설명 등)은 짧고 유용하므로 유지

_LOOKUP_SKIP_TRIGGERS = ("사용 예", "예시", "예)", "[INSERT 주의]", "[JSONB 예시]", "[_SE 컬럼 규칙]")
_LOOKUP_STRUCT_PREFIXES = ("-- int_", "컬럼:", "FK", "JOIN", "PK", "함수:", "-- [DB 함수]")


def _to_lookup_entry(entry: str) -> str:
    """단일 스키마 항목을 경량 버전으로 축약한다. 규칙 전용 블록이면 빈 문자열."""
    if entry.lstrip().startswith("-- [INSERT 규칙]"):
        return ""
    kept: list[str] = []
    skipping = False
    for ln in entry.split("\n"):
        s = ln.strip()
        if any(trig in s for trig in _LOOKUP_SKIP_TRIGGERS):
            skipping = True
            continue
        if skipping:
            if s.startswith(_LOOKUP_STRUCT_PREFIXES):
                skipping = False
            else:
                continue
        kept.append(ln)
    return "\n".join(kept).rstrip()


def get_schema_for_intent(intent: str, mode: str = "full") -> str:
    """
    공통 테이블(int_user, int_dept, int_jbgd, int_com_code) + intent 전용 테이블을 합쳐 반환한다.
    공통 테이블은 항상 앞에 위치해 LLM이 JOIN 대상을 먼저 인식하도록 한다.

    mode:
      "full"   — 전체 스키마 (SQL 생성용, 기본값). generate_sql이 사용.
      "lookup" — 경량 스키마 (ReAct 조회 루프용). INSERT 규칙·예시 SQL 제거로 토큰 절감.
    """
    entries = list(COMMON_TABLES) + [s for s in INTENT_SCHEMAS.get(intent, []) if s.strip()]
    if mode == "lookup":
        entries = [e for e in (_to_lookup_entry(x) for x in entries) if e.strip()]
    return "\n\n".join(entries)


# ── intent별 참조 데이터 쿼리 ──────────────────────────────────────────────────
# node_enrich_context에서 SQL 생성·preflight 이전에 실행하여
# LLM에게 DB에 실제 존재하는 코드값·ID 목록을 제공한다.
# 쿼리는 경량 마스터 조회만 허용 (WHERE use_yn='Y' 필수).

# 각 항목: {"label": 표시용 라벨, "sql": nm(표시명)·cd(코드값) 2컬럼 SELECT}
# node_enrich_context가 결과를 "표시명=코드값" 컴팩트 매핑으로 포맷해 주입한다.
# → SLM이 사용자 표현("연차")을 코드값('LEAVE_00001')으로 변환하기 쉬움.
# SELECT는 반드시 nm, cd 두 컬럼으로 alias 할 것.

INTENT_REFERENCE_QUERIES: dict[str, list[dict]] = {
    "leave": [
        {"label": "휴가유형(leave_cd)",
         "sql": "SELECT leave_nm AS nm, leave_cd AS cd FROM int_leave_mst "
                "WHERE use_yn='Y' ORDER BY leave_cd"},
        {"label": "휴가상세(leave_dtl_cd) — 표기: 휴가명 상세명(leave_cd=상위코드)=leave_dtl_cd",
         "sql": "SELECT lm.leave_nm||' '||ld.leave_dtl_nm||'(leave_cd='||ld.leave_cd||')' AS nm, "
                "ld.leave_dtl_cd AS cd "
                "FROM int_leave_dtl ld JOIN int_leave_mst lm ON ld.leave_cd = lm.leave_cd "
                "WHERE ld.use_yn='Y' ORDER BY ld.leave_cd, ld.leave_dtl_cd"},
        {"label": "결재결과(aprv_rslt_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='APRV_RSLT_SE' AND cd_lvl='2'"},
    ],
    "mtgr": [
        {"label": "회의실(mtgr_id)",
         "sql": "SELECT mtgr_nm AS nm, mtgr_id AS cd FROM int_mtgr "
                "WHERE use_yn='Y' ORDER BY mtgr_id"},
    ],
    "veh": [
        {"label": "차량(veh_id)",
         "sql": "SELECT veh_nm AS nm, veh_id AS cd FROM int_veh "
                "WHERE use_yn='Y' ORDER BY veh_id"},
    ],
    "brd": [
        {"label": "게시판(brd_id)",
         "sql": "SELECT brd_nm AS nm, brd_id AS cd FROM int_brd "
                "WHERE use_yn='Y' ORDER BY brd_id"},
    ],
    "schd": [
        {"label": "반복주기(loop_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='LOOP_SE' AND cd_lvl='2'"},
    ],
    "aprv": [
        {"label": "결재양식(aprv_form_id)",
         "sql": "SELECT aprv_form_nm AS nm, aprv_form_id AS cd FROM int_aprv_form_mst "
                "WHERE del_yn='N' ORDER BY aprv_form_id"},
        {"label": "양식항목(aprv_ref_cd) — 표기: 양식명 항목명(reqd_yn=필수여부)(aprv_form_id=양식코드)=항목코드",
         "sql": "SELECT m.aprv_form_nm||' '||d.aprv_ref_nm||'(reqd_yn='||d.reqd_yn||')(aprv_form_id='||d.aprv_form_id||')' AS nm, "
                "d.aprv_ref_cd AS cd "
                "FROM int_aprv_form_dtl d JOIN int_aprv_form_mst m ON d.aprv_form_id = m.aprv_form_id "
                "WHERE d.del_yn='N' AND m.del_yn='N' ORDER BY d.aprv_form_id, d.aprv_ref_cd"},
        {"label": "결재결과(aprv_rslt_se)",
         "sql": "SELECT cd_nm AS nm, cd AS cd FROM int_com_code "
                "WHERE use_yn='Y' AND up_cd='APRV_RSLT_SE' AND cd_lvl='2'"},
    ],
    "rpt": [
        {"label": "보고 양식(rpt_form_id) — 표기: 양식제목(보고주기)",
         "sql": "SELECT rpt_ttl||'('||rpt_dt_se||')' AS nm, rpt_form_id AS cd "
                "FROM int_rpt_form WHERE use_yn='Y' ORDER BY rpt_form_id"},
        {"label": "최근 회차(round_sn) — 표기: 양식제목 회차명(기준날짜)(rpt_form_id=양식코드)=회차번호",
         "sql": "SELECT f.rpt_ttl||' '||r.round_nm"
                "||'(round_ymd='||COALESCE(r.round_ymd,'')||')"
                "(rpt_form_id='||r.rpt_form_id||')' AS nm, "
                "r.round_sn::VARCHAR AS cd "
                "FROM int_rpt_round r JOIN int_rpt_form f ON r.rpt_form_id = f.rpt_form_id "
                "WHERE f.use_yn='Y' ORDER BY r.rpt_form_id, r.round_sn DESC LIMIT 10"},
    ],
    # general: 참조 데이터 불필요 → 미정의(빈 리스트 반환)
}


def get_reference_queries(intent: str) -> list[dict]:
    """intent에 해당하는 참조 쿼리 스펙(label+sql) 목록을 반환한다. 없으면 빈 리스트."""
    return INTENT_REFERENCE_QUERIES.get(intent, [])


# ── node_excu_preflight 전용 필수 입력 항목 ───────────────────────────────────
# 전체 SQL 스키마 대신 "사용자에게 확인해야 할 항목"만 짧게 기술한다.
# generate_sql은 여전히 get_schema_for_intent()의 전체 스키마를 사용한다.

PREFLIGHT_REQUIRED_FIELDS: dict[str, str] = {
    "leave": (
        "필수: 시작날짜, 종료날짜\n"
        "조건부: 시작시간·종료시간 (반차 등 시간단위 신청인 경우만)\n"
        "선택: 사유 (미입력이어도 is_complete=true — 기본값은 SQL 생성 시 자동 적용)\n"
        "[자동판단] 휴가유형: 사용자 표현('연차','반차' 등)과 참조데이터(int_leave_mst·int_leave_dtl)로 자동 결정 — 사용자에게 따로 묻지 않음"
    ),
    "mtgr": "필수: 예약날짜, 시작시간, 종료시간\n"
            "[자동판단] 회의실 : 사용자가 따로 회의실을 지정하지 않았을 경우 참조데이터 (int_mtgr·int_mtgr_rsv)로 자동결정 - 사용하는 첫번째 회의실로 결정 ",
    "veh":  "필수: 차량, 예약 시작일자, 시작시간, 종료시간",
    "aprv": (
        "필수: 결재양식 선택, 해당 양식의 reqd_yn='Y' 항목 모두 입력\n"
        "[자동판단] 양식: [참조 코드]의 결재양식 목록에서 사용자 요청에 맞는 양식 자동 결정 — 따로 묻지 않음\n"
        "[자동판단] 항목값: [참조 코드 - 양식항목]에서 reqd_yn='Y'인 항목만 사용자에게 확인. 'N' 항목은 생략 가능"
    ),
    "brd":  "필수: 게시판, 제목, 본문",
    "schd":  "필수: 일정이름, 일정시작일자, 일정종료일자\n"
             "[규칙] 반복일정으로 판단되면 공통코드 LOOP_SE를 판단하여 반복주기 입력 필수",
    "rpt": (
        "필수: 보고 양식, 회차 — [참조 코드]에서 자동 결정, 미언급이면 최신 회차\n"
        "exec_desc·plan_desc·sbmt_yn: 폼 패널에서 입력 → 내용 없어도 is_complete=true\n"
        "[권한] 수정/삭제: 본인 보고만. 제출완료(sbmt_yn='Y') 건 변경 불가\n"
        "[회차관리] 양식 관리자(rpt_adm_id)만 가능"
    ),
}


def get_preflight_fields(intent: str) -> str:
    """intent에 해당하는 preflight 필수 입력 항목 설명을 반환한다."""
    return PREFLIGHT_REQUIRED_FIELDS.get(intent, "필수 항목: 요청 내용에 필요한 핵심 정보")
