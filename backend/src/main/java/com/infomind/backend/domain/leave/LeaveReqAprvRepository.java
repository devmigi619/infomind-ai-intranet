package com.infomind.backend.domain.leave;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveReqAprvRepository extends JpaRepository<LeaveReqAprv, LeaveReqAprvId> {

    List<LeaveReqAprv> findByIdReqUserIdAndIdReqSnOrderByAprvOrdAsc(
            String reqUserId, Long reqSn);

    Optional<LeaveReqAprv> findByIdReqUserIdAndIdReqSnAndIdAprvUserId(
            String reqUserId, Long reqSn, String aprvUserId);

    void deleteByIdReqUserIdAndIdReqSn(String reqUserId, Long reqSn);
}
