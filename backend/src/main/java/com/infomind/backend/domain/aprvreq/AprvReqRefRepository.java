package com.infomind.backend.domain.aprvreq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AprvReqRefRepository extends JpaRepository<AprvReqRef, AprvReqRefId> {

    List<AprvReqRef> findByAprvFormIdAndReqUserIdAndAprvReqSn(
            String aprvFormId, String reqUserId, Long aprvReqSn);

    @Modifying
    @Query("DELETE FROM AprvReqRef r WHERE r.aprvFormId = :formId AND r.reqUserId = :reqUserId AND r.aprvReqSn = :sn")
    void deleteByKey(@Param("formId") String aprvFormId,
                     @Param("reqUserId") String reqUserId,
                     @Param("sn") Long aprvReqSn);
}
