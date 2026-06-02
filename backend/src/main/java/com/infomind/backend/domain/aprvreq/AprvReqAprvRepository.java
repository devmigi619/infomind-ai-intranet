package com.infomind.backend.domain.aprvreq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AprvReqAprvRepository extends JpaRepository<AprvReqAprv, AprvReqAprvId> {

    List<AprvReqAprv> findByAprvFormIdAndReqUserIdAndAprvReqSnOrderByAprvOrdAsc(
            String aprvFormId, String reqUserId, Long aprvReqSn);

    Optional<AprvReqAprv> findByAprvFormIdAndReqUserIdAndAprvReqSnAndAprvUserId(
            String aprvFormId, String reqUserId, Long aprvReqSn, String aprvUserId);

    /** 현재 대기 중인 첫 번째 결재자 (aprvOrd 최소, aprvSe=null) */
    @Query("""
        SELECT a FROM AprvReqAprv a
        WHERE a.aprvFormId = :formId AND a.reqUserId = :reqUserId AND a.aprvReqSn = :sn
          AND a.aprvSe IS NULL
        ORDER BY a.aprvOrd ASC
        """)
    List<AprvReqAprv> findPendingByKey(@Param("formId") String aprvFormId,
                                        @Param("reqUserId") String reqUserId,
                                        @Param("sn") Long aprvReqSn);

    @Modifying
    @Query("DELETE FROM AprvReqAprv a WHERE a.aprvFormId = :formId AND a.reqUserId = :reqUserId AND a.aprvReqSn = :sn")
    void deleteByKey(@Param("formId") String aprvFormId,
                     @Param("reqUserId") String reqUserId,
                     @Param("sn") Long aprvReqSn);
}
