-- ================================================================
-- F_LOOP_SCHD_CALC
-- 반복 일정(loop_yn='Y')의 실제 발생일을 지정 조회 범위 내에서 전개한다.
--
-- 파라미터
--   p_schd_sn  : int_schd.schd_sn  (loop_yn='Y' 행만 유효)
--   p_from_ymd : 조회 시작일 YYYYMMDD
--   p_to_ymd   : 조회 종료일 YYYYMMDD
--
-- 반환 TABLE
--   occur_st_ymd  VARCHAR(8) : 발생 시작일 YYYYMMDD
--   occur_end_ymd VARCHAR(8) : 발생 종료일 YYYYMMDD
--                              원본의 기간(schd_end_ymd - schd_st_ymd 일수)이 각 발생에 동일 적용
--
-- 예외 처리 (int_schd_excp)
--   end_yn='N' : 해당 excp_ymd 날짜의 발생만 건너뜀
--   end_yn='Y' : 해당 excp_ymd 이후 반복 전체 종료 (해당일 포함 이후 발생 없음)
--
-- loop_se 코드값 → 주기
--   DAY   : 매일
--   WEEK  : 매주 (7일 간격)
--   MONTH : 매월 (같은 날짜, PostgreSQL interval '1 month' 적용)
--   YEAR  : 매년 (같은 월·일)
-- ================================================================
CREATE OR REPLACE FUNCTION F_LOOP_SCHD_CALC(
    p_schd_sn  BIGINT,
    p_from_ymd VARCHAR(8),
    p_to_ymd   VARCHAR(8)
)
RETURNS TABLE(occur_st_ymd VARCHAR(8), occur_end_ymd VARCHAR(8))
LANGUAGE plpgsql
AS $$
DECLARE
    v_st_date   DATE;      -- 반복 최초 시작일
    v_end_date  DATE;      -- 반복 최초 종료일 (기간 계산용)
    v_loop_se   VARCHAR;   -- 반복 주기 코드
    v_duration  INT;       -- 각 발생 건의 기간(일수) = v_end_date - v_st_date
    v_recur_end DATE;      -- 반복 종료 상한 (end_yn='Y' 예외일-1 또는 p_to_ymd)
    v_interval  INTERVAL;  -- loop_se → INTERVAL 변환값
BEGIN
    -- ── 1. 반복 일정 기본 정보 조회 ────────────────────────────────────────
    SELECT
        TO_DATE(s.schd_st_ymd,  'YYYYMMDD'),
        TO_DATE(s.schd_end_ymd, 'YYYYMMDD'),
        s.loop_se
    INTO v_st_date, v_end_date, v_loop_se
    FROM int_schd s
    WHERE s.schd_sn = p_schd_sn
      AND s.loop_yn = 'Y';

    -- 반복 일정이 아니거나 존재하지 않으면 빈 결과 반환
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- ── 2. 기간(duration) 및 반복 주기(interval) 결정 ──────────────────────
    -- 각 발생 건의 기간 = 원본 종료일 - 원본 시작일 (일수)
    -- ex) schd_st=20250101, schd_end=20250102 → 각 발생이 1박 2일 기간
    v_duration := v_end_date - v_st_date;

    v_interval := CASE v_loop_se
        WHEN 'DAY'   THEN INTERVAL '1 day'
        WHEN 'WEEK'  THEN INTERVAL '7 days'
        WHEN 'MONTH' THEN INTERVAL '1 month'
        WHEN 'YEAR'  THEN INTERVAL '1 year'
        ELSE              INTERVAL '1 day'   -- 미정의 코드 방어 처리
    END;

    -- ── 3. 반복 종료 상한 결정 ──────────────────────────────────────────────
    -- end_yn='Y' 예외가 있으면 해당 날짜 전날까지만 반복
    -- 복수 end_yn='Y' 행이 있으면 가장 빠른 날짜 기준
    SELECT MIN(TO_DATE(e.excp_ymd, 'YYYYMMDD')) - 1
    INTO v_recur_end
    FROM int_schd_excp e
    WHERE e.schd_sn = p_schd_sn
      AND e.end_yn  = 'Y';

    -- end_yn='Y' 예외 없거나 조회 종료일보다 늦으면 조회 종료일을 상한으로
    IF v_recur_end IS NULL OR v_recur_end > TO_DATE(p_to_ymd, 'YYYYMMDD') THEN
        v_recur_end := TO_DATE(p_to_ymd, 'YYYYMMDD');
    END IF;

    -- ── 4. 발생일 전개 및 필터링 ────────────────────────────────────────────
    -- generate_series: 최초 시작일 ~ 반복 종료 상한, v_interval 간격
    -- 필터 A: end_yn='N' 예외 날짜 제외 (해당 발생만 건너뜀)
    -- 필터 B: 발생 기간이 조회 범위와 겹치는 경우만 반환
    --         occur_st <= p_to_ymd  AND  (occur_st + duration) >= p_from_ymd
    RETURN QUERY
    SELECT
        TO_CHAR(gs.dt,              'YYYYMMDD')::VARCHAR(8) AS occur_st_ymd,
        TO_CHAR(gs.dt + v_duration, 'YYYYMMDD')::VARCHAR(8) AS occur_end_ymd
    FROM (
        SELECT generate_series(v_st_date, v_recur_end, v_interval)::DATE AS dt
    ) gs
    -- [필터 A] end_yn='N': 해당 발생 시작일만 건너뜀
    WHERE NOT EXISTS (
        SELECT 1
        FROM int_schd_excp e
        WHERE e.schd_sn = p_schd_sn
          AND e.end_yn  = 'N'
          AND TO_DATE(e.excp_ymd, 'YYYYMMDD') = gs.dt
    )
    -- [필터 B] 발생 기간이 조회 범위와 겹치는 경우만 포함 (멀티데이 일정 고려)
    AND gs.dt                <= TO_DATE(p_to_ymd,   'YYYYMMDD')  -- 발생 시작 ≤ 조회 종료
    AND gs.dt + v_duration   >= TO_DATE(p_from_ymd, 'YYYYMMDD')  -- 발생 종료 ≥ 조회 시작
    ORDER BY gs.dt;
END;
$$;
