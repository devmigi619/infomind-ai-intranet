package com.infomind.backend.domain.aprvreq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AprvReqRepository extends JpaRepository<AprvReq, AprvReqId> {

    /** 내 결재함: 내가 신청한 결재 목록 (삭제 제외, 최신순) */
    List<AprvReq> findByReqUserIdAndDelYnOrderByCrtAtDesc(String reqUserId, String delYn);

    /** 상세 조회 (삭제 제외) */
    Optional<AprvReq> findByAprvFormIdAndReqUserIdAndAprvReqSnAndDelYn(
            String aprvFormId, String reqUserId, Long aprvReqSn, String delYn);

    /** 다음 일련번호 = MAX(aprvReqSn) + 1 (per formId+userId) */
    @Query("SELECT COALESCE(MAX(r.aprvReqSn), 0) + 1 FROM AprvReq r " +
           "WHERE r.aprvFormId = :aprvFormId AND r.reqUserId = :reqUserId")
    Long nextSn(@Param("aprvFormId") String aprvFormId, @Param("reqUserId") String reqUserId);

    /** 결재 대기함: 내가 결재해야 할 목록 */
    @Query("""
        SELECT DISTINCT r FROM AprvReq r
        JOIN AprvReqAprv a ON r.aprvFormId = a.aprvFormId
                          AND r.reqUserId  = a.reqUserId
                          AND r.aprvReqSn  = a.aprvReqSn
        WHERE a.aprvUserId   = :userId
          AND a.aprvSe        IS NULL
          AND r.aprvRsltSe   IN ('1','2')
          AND r.delYn         = 'N'
          AND NOT EXISTS (
              SELECT 1 FROM AprvReqAprv prev
              WHERE prev.aprvFormId = a.aprvFormId
                AND prev.reqUserId  = a.reqUserId
                AND prev.aprvReqSn  = a.aprvReqSn
                AND prev.aprvOrd    < a.aprvOrd
                AND prev.aprvSe     IS NULL
          )
        ORDER BY r.crtAt DESC
        """)
    List<AprvReq> findPendingForMe(@Param("userId") String userId);
}
