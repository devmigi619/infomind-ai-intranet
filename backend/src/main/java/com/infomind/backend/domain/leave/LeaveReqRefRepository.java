package com.infomind.backend.domain.leave;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveReqRefRepository extends JpaRepository<LeaveReqRef, LeaveReqRefId> {

    List<LeaveReqRef> findByIdReqUserIdAndIdReqSn(String reqUserId, Long reqSn);

    java.util.Optional<LeaveReqRef> findByIdReqUserIdAndIdReqSnAndIdRefUserId(
            String reqUserId, Long reqSn, String refUserId);

    void deleteByIdReqUserIdAndIdReqSn(String reqUserId, Long reqSn);
}
