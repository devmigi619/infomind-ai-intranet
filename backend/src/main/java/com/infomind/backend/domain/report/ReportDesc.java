package com.infomind.backend.domain.report;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_RPT_DESC")
@IdClass(ReportDescId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ReportDesc extends BaseEntity {

    @Id
    @Column(name = "RPT_FORM_ID", length = 100)
    private String rptFormId;

    @Id
    @Column(name = "ROUND_SN")
    private Long roundSn;

    @Id
    @Column(name = "USER_ID", length = 100)
    private String userId;

    @Column(name = "EXEC_DESC", columnDefinition = "TEXT")
    private String execDesc;

    @Column(name = "PLAN_DESC", columnDefinition = "TEXT")
    private String planDesc;

    @Column(name = "SBMT_YN", length = 1, nullable = false)
    private String sbmtYn;

    @Column(name = "SBMT_YMD", length = 8)
    private String sbmtYmd;

    public void saveDraft(String execDesc, String planDesc) {
        this.execDesc = execDesc;
        this.planDesc = planDesc;
        this.sbmtYn = "N";
        this.sbmtYmd = null;
    }

    public void submit(String execDesc, String planDesc, String sbmtYmd) {
        this.execDesc = execDesc;
        this.planDesc = planDesc;
        this.sbmtYn = "Y";
        this.sbmtYmd = sbmtYmd;
    }
}
