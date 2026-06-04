package com.infomind.backend.domain.report;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_RPT_FORM")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ReportForm extends BaseEntity {

    @Id
    @Column(name = "RPT_FORM_ID", length = 100)
    private String rptFormId;

    @Column(name = "RPT_TTL", length = 300, nullable = false)
    private String rptTtl;

    @Column(name = "RPT_DESC", columnDefinition = "TEXT", nullable = false)
    private String rptDesc;

    @Column(name = "RPT_DT_SE", length = 20)
    private String rptDtSe;

    @Column(name = "RPT_ADM_ID", length = 100)
    private String rptAdmId;

    @Column(name = "ST_YMD", length = 8)
    private String stYmd;

    @Column(name = "DEPT_CD", length = 20, nullable = false)
    private String deptCd;

    @Column(name = "OPEN_YN", length = 1, nullable = false)
    @Builder.Default
    private String openYn = "Y";

    @Column(name = "USE_YN", length = 1, nullable = false)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    public void updateOperatingValues(String rptTtl, String rptDesc, String rptAdmId,
                                      String openYn, String useYn, String rmk) {
        this.rptTtl = rptTtl;
        this.rptDesc = rptDesc;
        this.rptAdmId = rptAdmId;
        this.openYn = openYn;
        this.useYn = useYn;
        this.rmk = rmk;
    }

    public void updateAll(String rptTtl, String rptDesc, String rptDtSe, String rptAdmId,
                          String stYmd, String deptCd, String openYn, String useYn, String rmk) {
        updateOperatingValues(rptTtl, rptDesc, rptAdmId, openYn, useYn, rmk);
        this.rptDtSe = rptDtSe;
        this.stYmd = stYmd;
        this.deptCd = deptCd;
    }

    public void setUseYn(String useYn) {
        this.useYn = useYn;
    }
}
