package com.infomind.backend.domain.aprvreq;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_APRV_REQ_APRV")
@IdClass(AprvReqAprvId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AprvReqAprv extends BaseEntity {

    @Id
    @Column(name = "APRV_FORM_ID", length = 100)
    private String aprvFormId;

    @Id
    @Column(name = "REQ_USER_ID", length = 100)
    private String reqUserId;

    @Id
    @Column(name = "APRV_REQ_SN")
    private Long aprvReqSn;

    @Id
    @Column(name = "APRV_USER_ID", length = 100)
    private String aprvUserId;

    /** 결재구분: null=대기, '3'=승인, '9'=반려 */
    @Column(name = "APRV_SE", length = 20)
    private String aprvSe;

    @Column(name = "APRV_YMD", length = 8)
    private String aprvYmd;

    @Column(name = "APRV_ORD")
    private Long aprvOrd;

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    public void approve(String rmk, String today) {
        this.aprvSe  = "3";
        this.aprvYmd = today;
        this.rmk     = rmk;
    }

    public void reject(String rmk, String today) {
        this.aprvSe  = "9";
        this.aprvYmd = today;
        this.rmk     = rmk;
    }
}
