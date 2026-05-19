package com.infomind.backend.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    /** 단발 일정 기간 조회 — loopYn='N' 이고 요청 범위와 겹치는 것. */
    @Query("SELECT s FROM Schedule s " +
           "WHERE s.loopYn = 'N' " +
           "  AND s.schdStYmd <= :endYmd " +
           "  AND s.schdEndYmd >= :stYmd")
    List<Schedule> findNonRepeatingInRange(String stYmd, String endYmd);

    /** 반복 일정 전체 조회 — 발생일 계산은 서비스에서 처리. */
    @Query("SELECT s FROM Schedule s WHERE s.loopYn = 'Y'")
    List<Schedule> findAllRepeating();

    /** 현재 최대 SCHD_SN 반환. 행이 없으면 0. */
    @Query("SELECT COALESCE(MAX(s.schdSn), 0) FROM Schedule s")
    Long findMaxSchdSn();
}
