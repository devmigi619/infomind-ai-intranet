package com.infomind.backend.domain.schedule;

import com.infomind.backend.domain.schedule.dto.SchdQryRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    /**
     * f_schd_qry DB 함수로 단일+반복 일정 통합 조회.
     * 참석자 등록 일정 + 전사 공통(dept_cd IS NULL) + 소속 부서 일정을 모두 반환한다.
     * 반복 일정의 발생일 전개 및 int_schd_excp 예외 처리는 DB 함수 내부에서 처리된다.
     *
     * @param deptCd 사용자 소속 부서 코드. null 허용 (전사 공통 일정만 포함됨).
     */
    @Query(value = "SELECT * FROM f_schd_qry(:userId, :deptCd, :fromYmd, :toYmd)",
           nativeQuery = true)
    List<SchdQryRow> findByFuncQry(@Param("userId") String userId,
                                   @Param("deptCd") String deptCd,
                                   @Param("fromYmd") String fromYmd,
                                   @Param("toYmd") String toYmd);

    /** 현재 최대 SCHD_SN 반환. 행이 없으면 0. */
    @Query("SELECT COALESCE(MAX(s.schdSn), 0) FROM Schedule s")
    Long findMaxSchdSn();
}
