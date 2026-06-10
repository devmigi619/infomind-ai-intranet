package com.infomind.backend.domain.schedule.dto;

/**
 * f_schd_qry() 네이티브 쿼리 결과 Projection.
 *
 * 컬럼 순서는 함수 정의와 동일하게 유지해야 합니다.
 * schd_sn, schd_nm, occur_st_ymd, occur_end_ymd, schd_st_hr, schd_end_hr,
 * loop_yn, loop_se, writer_id, dept_cd, rmk, user_attd_yn
 */
public interface SchdQryRow {
    Long   getSchdSn();
    String getSchdNm();
    String getOccurStYmd();
    String getOccurEndYmd();
    String getSchdStHr();
    String getSchdEndHr();
    String getLoopYn();
    String getLoopSe();
    String getWriterId();
    String getDeptCd();
    String getRmk();
    String getUserAttdYn();
}
