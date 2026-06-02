package com.infomind.backend.domain.aprvreq;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "INT_APRV_REQ")
@IdClass(AprvReqId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AprvReq extends BaseEntity {

    @Id
    @Column(name = "APRV_FORM_ID", length = 100)
    private String aprvFormId;

    @Id
    @Column(name = "REQ_USER_ID", length = 100)
    private String reqUserId;

    @Id
    @Column(name = "APRV_REQ_SN")
    private Long aprvReqSn;

    @Column(name = "APRV_REQ_DESC", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> aprvReqDesc;

    @Column(name = "APRV_RSLT_SE", length = 20)
    @Builder.Default
    private String aprvRsltSe = "1";

    @Column(name = "AFILE_ID", length = 100)
    private String afileId;

    @Column(name = "DEPT_REF_YN", length = 1)
    @Builder.Default
    private String deptRefYn = "N";

    @Column(name = "REQ_SUM", columnDefinition = "TEXT")
    private String reqSum;

    @Column(name = "REQ_YMD", length = 8)
    private String reqYmd;

    @Column(name = "QRY_CNT")
    private Integer qryCnt;

    @Column(name = "DEL_YN", length = 1)
    @Builder.Default
    private String delYn = "N";

    public void updateStatus(String aprvRsltSe) {
        this.aprvRsltSe = aprvRsltSe;
    }

    public void cancel() {
        this.delYn = "Y";
    }
}
