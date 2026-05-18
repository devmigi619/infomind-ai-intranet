package com.infomind.backend.domain.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LeaveReqMstRepository extends JpaRepository<LeaveReqMst, LeaveReqMstId> {

    /** 첨부파일 그룹 ID로 신청 마스터 조회 (권한 판단용) */
    Optional<LeaveReqMst> findByAfileId(String afileId);

    /** 내 신청 목록 — 최신순 */
    List<LeaveReqMst> findByIdReqUserIdOrderByIdReqSnDesc(String reqUserId);

    /** 결재자로 포함된 미처리 신청 목록 */
    @Query("""
        SELECT DISTINCT m FROM LeaveReqMst m
        JOIN LeaveReqAprv a ON a.id.reqUserId = m.id.reqUserId
                            AND a.id.reqSn    = m.id.reqSn
        WHERE a.id.aprvUserId = :aprvUserId
          AND a.aprvSe IS NULL
          AND m.aprvRsltSe IN ('1','2')
        ORDER BY m.id.reqSn DESC
        """)
    List<LeaveReqMst> findPendingByApprover(@Param("aprvUserId") String aprvUserId);

    /** 사용자별 최대 reqSn */
    @Query("SELECT MAX(m.id.reqSn) FROM LeaveReqMst m WHERE m.id.reqUserId = :userId")
    Optional<Long> findMaxReqSn(@Param("userId") String userId);
}
