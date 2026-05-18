package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "INT_LEAVE_DTL")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveDtl extends BaseEntity {

    @EmbeddedId
    private LeaveDtlId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("leaveCd")
    @JoinColumn(name = "LEAVE_CD")
    private LeaveMst leaveMst;

    @Column(name = "LEAVE_DTL_NM", length = 100)
    private String leaveDtlNm;

    @Column(name = "LEAVE_DTL_DESC", length = 1000)
    private String leaveDtlDesc;

    /** 종일(F)/반일(H) — INT_COM_CODE UP_CD='LEAVE_SE' */
    @Column(name = "LEAVE_SE", length = 20)
    private String leaveSe;

    /** 사용 가능 일수 (소수점 1자리: 0.5 반일 등) */
    @Column(name = "USE_AVL_DCNT", columnDefinition = "numeric(5,1)")
    private BigDecimal useAvlDcnt;

    @Column(name = "USE_YN", length = 1, nullable = false)
    @Builder.Default
    private String useYn = "Y";

    public void update(String leaveDtlNm, String leaveDtlDesc,
                       String leaveSe, BigDecimal useAvlDcnt, String useYn) {
        this.leaveDtlNm   = leaveDtlNm;
        this.leaveDtlDesc = leaveDtlDesc;
        this.leaveSe      = leaveSe;
        this.useAvlDcnt   = useAvlDcnt;
        this.useYn        = useYn;
    }
}
