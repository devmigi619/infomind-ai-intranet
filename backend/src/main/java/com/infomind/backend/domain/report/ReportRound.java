package com.infomind.backend.domain.report;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_RPT_ROUND")
@IdClass(ReportRoundId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ReportRound extends BaseEntity {

    @Id
    @Column(name = "RPT_FORM_ID", length = 100)
    private String rptFormId;

    @Id
    @Column(name = "ROUND_SN")
    private Long roundSn;

    @Column(name = "ROUND_NM", columnDefinition = "TEXT", nullable = false)
    private String roundNm;

    @Column(name = "ROUND_YMD", length = 8)
    private String roundYmd;

    @Column(name = "RPT_SUM", columnDefinition = "TEXT")
    private String rptSum;

    public void update(String roundNm, String roundYmd) {
        this.roundNm = roundNm;
        this.roundYmd = roundYmd;
    }

    public void updateSummary(String rptSum) {
        this.rptSum = rptSum;
    }
}
