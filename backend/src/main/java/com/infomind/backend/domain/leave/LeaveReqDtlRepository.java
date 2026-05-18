package com.infomind.backend.domain.leave;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveReqDtlRepository extends JpaRepository<LeaveReqDtl, LeaveReqDtlId> {

    List<LeaveReqDtl> findByIdReqUserIdAndIdReqSnOrderByIdLeaveUseYmdAsc(
            String reqUserId, Long reqSn);

    void deleteByIdReqUserIdAndIdReqSn(String reqUserId, Long reqSn);
}
