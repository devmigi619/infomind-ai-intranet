package com.infomind.backend.domain.leave;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_LEAVE_REQ_APRV")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveReqAprv extends BaseEntity {

    @EmbeddedId
    private LeaveReqAprvId id;

    /** 결재 순서 */
    @Column(name = "APRV_ORD")
    private Integer aprvOrd;

    /**
     * 결재 구분 (개인 처리 결과)
     * null=미처리, 3=승인, 9=반려
     */
    @Column(name = "APRV_SE", length = 2)
    private String aprvSe;

    /** 결재일자 YYYYMMDD */
    @Column(name = "APRV_YMD", length = 8)
    private String aprvYmd;

    /** 반려 사유 */
    @Column(name = "RMK", length = 500)
    private String rmk;

    public void approve(String aprvYmd) {
        this.aprvSe  = "3";
        this.aprvYmd = aprvYmd;
    }

    public void reject(String aprvYmd, String rmk) {
        this.aprvSe  = "9";
        this.aprvYmd = aprvYmd;
        this.rmk     = rmk;
    }
}
