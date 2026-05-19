package com.infomind.backend.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ScheduleExcpRepository extends JpaRepository<ScheduleExcp, ScheduleExcpId> {

    /** 일정 번호로 예외 목록 조회. */
    List<ScheduleExcp> findBySchdSn(Long schdSn);

    /** 일정 번호로 예외 전체 삭제. */
    @Modifying
    @Transactional
    void deleteBySchdSn(Long schdSn);
}
