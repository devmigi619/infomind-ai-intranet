package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "INT_LEAVE_POL")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeavePol extends BaseEntity {

    @Id
    @Column(name = "LEAVE_POL_CD", length = 20)
    private String leavePolCd;

    @Column(name = "LEAVE_POL_NM", length = 50, nullable = false)
    private String leavePolNm;

    @Column(name = "LEAVE_POL_DESC", columnDefinition = "text")
    private String leavePolDesc;

    /** 적용 시작 근속 개월 (입사일 기준) */
    @Column(name = "POL_ST_MON")
    private Integer polStMon;

    /** 적용 종료 근속 개월 (마지막 구간은 999) */
    @Column(name = "POL_END_MON")
    private Integer polEndMon;

    /** 기본 연차 일수 */
    @Column(name = "LEAVE_DCNT", columnDefinition = "numeric(5,1)")
    private BigDecimal leaveDcnt;

    /** 추가 일수 */
    @Column(name = "ADD_DCNT", columnDefinition = "numeric(5,1)")
    private BigDecimal addDcnt;

    /** 추가 발생 주기 (개월) */
    @Column(name = "ADD_CYC_MON")
    private Integer addCycMon;

    /** 최대 일수 */
    @Column(name = "MAX_DCNT", columnDefinition = "numeric(5,1)")
    private BigDecimal maxDcnt;

    @Column(name = "USE_YN", length = 1, nullable = false)
    @Builder.Default
    private String useYn = "Y";

    public void update(String leavePolNm, String leavePolDesc,
                       Integer polStMon, Integer polEndMon,
                       BigDecimal leaveDcnt, BigDecimal addDcnt,
                       Integer addCycMon, BigDecimal maxDcnt, String useYn) {
        this.leavePolNm  = leavePolNm;
        this.leavePolDesc = leavePolDesc;
        this.polStMon    = polStMon;
        this.polEndMon   = polEndMon;
        this.leaveDcnt   = leaveDcnt;
        this.addDcnt     = addDcnt;
        this.addCycMon   = addCycMon;
        this.maxDcnt     = maxDcnt;
        this.useYn       = useYn;
    }
}
