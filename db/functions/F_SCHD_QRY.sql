-- ================================================================
-- F_SCHD_QRY
-- 사용자 기준 조회 범위 내 전체 일정을 반환한다.
-- 단일 일정(loop_yn='N')과 반복 일정(loop_yn='Y')을 UNION ALL로 통합.
-- 반복 일정은 내부에서 F_LOOP_SCHD_CALC를 호출해 발생일을 전개한다.
--
-- 파라미터
--   p_user_id  : 조회 사용자 ID
--   p_dept_cd  : 조회 사용자의 소속 부서 코드 (NULL 가능)
--   p_from_ymd : 조회 시작일 YYYYMMDD
--   p_to_ymd   : 조회 종료일 YYYYMMDD
--
-- 조회 범위 (OR 조건 — 하나 이상 해당하면 포함)
--   1. 참석자로 등록된 일정 : int_schd_attd.attd_user_id = p_user_id
--   2. 전사 공통 일정       : int_schd.dept_cd IS NULL
--   3. 소속 부서 일정       : int_schd.dept_cd = p_dept_cd
--
-- 반환 컬럼
--   schd_sn       : 일정 시퀀스
--   schd_nm       : 일정명
--   occur_st_ymd  : 실제 발생 시작일 (단일: schd_st_ymd 그대로, 반복: 전개된 날짜)
--   occur_end_ymd : 실제 발생 종료일 (단일: schd_end_ymd 그대로, 반복: 전개된 날짜)
--   schd_st_hr    : 시작 시간 HHMM (NULL = 종일 일정)
--   schd_end_hr   : 종료 시간 HHMM (NULL = 종일 일정)
--   loop_yn       : 반복 여부 Y/N
--   loop_se       : 반복 주기 코드 (loop_yn='N'이면 NULL)
--   writer_id     : 일정 작성자 user_id
--   dept_cd       : 대상 부서 코드 (NULL = 전사 공통)
--   rmk           : 상세 내용
--   user_attd_yn  : 참석자로 등록된 경우 참석 응답(Y/N), 미등록이면 NULL
--
-- 정렬: occur_st_ymd ASC, 종일 일정(schd_st_hr NULL) 상단
-- ================================================================
CREATE OR REPLACE FUNCTION F_SCHD_QRY(
    p_user_id  VARCHAR,
    p_dept_cd  VARCHAR,
    p_from_ymd VARCHAR(8),
    p_to_ymd   VARCHAR(8)
)
RETURNS TABLE(
    schd_sn       BIGINT,
    schd_nm       VARCHAR,
    occur_st_ymd  VARCHAR(8),
    occur_end_ymd VARCHAR(8),
    schd_st_hr    VARCHAR(4),
    schd_end_hr   VARCHAR(4),
    loop_yn       VARCHAR(1),
    loop_se       VARCHAR,
    writer_id     VARCHAR,
    dept_cd       VARCHAR,
    rmk           TEXT,
    user_attd_yn  VARCHAR(1)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY

    -- ── 1. 단일 일정 (loop_yn='N') ─────────────────────────────────────────
    SELECT
        s.schd_sn,
        s.schd_nm,
        s.schd_st_ymd                        AS occur_st_ymd,
        s.schd_end_ymd                       AS occur_end_ymd,
        s.schd_st_hr,
        s.schd_end_hr,
        s.loop_yn,
        s.loop_se,
        s.user_id                            AS writer_id,
        s.dept_cd,
        s.rmk,
        a.user_attd_yn
    FROM int_schd s
    -- user_attd_yn 조회용 LEFT JOIN (히트 여부로 참석자 등록 판별)
    LEFT JOIN int_schd_attd a
        ON  a.schd_sn      = s.schd_sn
        AND a.attd_user_id = p_user_id
    WHERE s.loop_yn = 'N'
      -- 일정 기간이 조회 범위와 겹치는 경우 (멀티데이 포함)
      AND TO_DATE(s.schd_st_ymd,  'YYYYMMDD') <= TO_DATE(p_to_ymd,   'YYYYMMDD')
      AND TO_DATE(s.schd_end_ymd, 'YYYYMMDD') >= TO_DATE(p_from_ymd, 'YYYYMMDD')
      -- 조회 범위 조건
      AND (
          a.attd_user_id IS NOT NULL     -- 참석자로 등록된 일정 (LEFT JOIN 히트)
          OR s.dept_cd IS NULL           -- 전사 공통 일정
          OR s.dept_cd = p_dept_cd       -- 소속 부서 일정
      )

    UNION ALL

    -- ── 2. 반복 일정 (loop_yn='Y') ─────────────────────────────────────────
    -- CROSS JOIN LATERAL: s 각 행에 대해 F_LOOP_SCHD_CALC 호출
    -- 범위 내 발생이 없으면 해당 일정은 결과에서 자동 제외됨
    SELECT
        s.schd_sn,
        s.schd_nm,
        c.occur_st_ymd,
        c.occur_end_ymd,
        s.schd_st_hr,
        s.schd_end_hr,
        s.loop_yn,
        s.loop_se,
        s.user_id                            AS writer_id,
        s.dept_cd,
        s.rmk,
        a.user_attd_yn
    FROM int_schd s
    -- F_LOOP_SCHD_CALC: 반복 일정의 발생일을 조회 범위 내에서 전개
    CROSS JOIN LATERAL F_LOOP_SCHD_CALC(s.schd_sn, p_from_ymd, p_to_ymd) c
    LEFT JOIN int_schd_attd a
        ON  a.schd_sn      = s.schd_sn
        AND a.attd_user_id = p_user_id
    WHERE s.loop_yn = 'Y'
      -- 최초 시작일이 조회 종료일 이전인 경우만 처리 (아직 시작 안 된 일정 제외)
      AND TO_DATE(s.schd_st_ymd, 'YYYYMMDD') <= TO_DATE(p_to_ymd, 'YYYYMMDD')
      -- 조회 범위 조건
      AND (
          a.attd_user_id IS NOT NULL
          OR s.dept_cd IS NULL
          OR s.dept_cd = p_dept_cd
      )

    -- 발생일 오름차순, 종일 일정(schd_st_hr NULL)은 동일 날짜 내 최상단
    ORDER BY occur_st_ymd ASC, schd_st_hr ASC NULLS FIRST;
END;
$$;
