package com.infomind.backend.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

public interface ScheduleAttdRepository extends JpaRepository<ScheduleAttd, ScheduleAttdId> {

    /** 일정 번호로 참석자 목록 조회. */
    List<ScheduleAttd> findBySchdSn(Long schdSn);

    /** 복수 일정 번호에 해당하는 참석자 일괄 조회 (findByRange 최적화용). */
    List<ScheduleAttd> findBySchdSnIn(Collection<Long> schdSns);

    /** 일정 번호로 참석자 전체 삭제 (수정 시 재구성). */
    @Modifying
    @Transactional
    void deleteBySchdSn(Long schdSn);
}
