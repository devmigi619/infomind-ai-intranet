package com.infomind.backend.domain.leave;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "INT_LEAVE_REQ_MST")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveReqMst extends BaseEntity {

    @EmbeddedId
    private LeaveReqMstId id;

    /** 사유 */
    @Column(name = "LEAVE_RSN", length = 500)
    private String leaveRsn;

    /**
     * 결재 결과 상태 코드
     * 1=신청, 2=진행, 3=승인, 9=반려
     */
    @Column(name = "APRV_RSLT_SE", length = 2, nullable = false)
    @Builder.Default
    private String aprvRsltSe = "1";

    /** 휴가유형 코드 (FK → INT_LEAVE_MST) */
    @Column(name = "LEAVE_CD", length = 20)
    private String leaveCd;

    /** 세부유형 코드 (FK → INT_LEAVE_DTL) */
    @Column(name = "LEAVE_DTL_CD", length = 20)
    private String leaveDtlCd;

    /** 사용일수 */
    @Column(name = "LEAVE_USE_DCNT", columnDefinition = "numeric(5,1)")
    private BigDecimal leaveUseDcnt;

    /** 부서원 수신참조 자동포함 여부 Y/N */
    @Column(name = "DEPT_REF_YN", length = 1)
    @Builder.Default
    private String deptRefYn = "N";

    /** 첨부파일 아이디 */
    @Column(name = "AFILE_ID", length = 400)
    private String afileId;

    public void updateStatus(String aprvRsltSe) {
        this.aprvRsltSe = aprvRsltSe;
    }

    public void update(String leaveRsn, String leaveCd, String leaveDtlCd,
                       BigDecimal leaveUseDcnt, String deptRefYn, String afileId) {
        this.leaveRsn    = leaveRsn;
        this.leaveCd     = leaveCd;
        this.leaveDtlCd  = leaveDtlCd;
        this.leaveUseDcnt = leaveUseDcnt;
        this.deptRefYn   = deptRefYn;
        this.afileId   = afileId;
    }
}
