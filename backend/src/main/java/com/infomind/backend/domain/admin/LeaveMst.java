package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_LEAVE_MST")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveMst extends BaseEntity {

    @Id
    @Column(name = "LEAVE_CD", length = 20)
    private String leaveCd;

    @Column(name = "LEAVE_NM", length = 50, nullable = false)
    private String leaveNm;

    /** 차감 여부 Y/N */
    @Column(name = "DED_YN", length = 1, nullable = false)
    private String dedYn;

    /** 유급 여부 Y/N */
    @Column(name = "PAID_YN", length = 1, nullable = false)
    private String paidYn;

    @Column(name = "USE_YN", length = 1, nullable = false)
    @Builder.Default
    private String useYn = "Y";

    public void update(String leaveNm, String dedYn, String paidYn, String useYn) {
        this.leaveNm = leaveNm;
        this.dedYn   = dedYn;
        this.paidYn  = paidYn;
        this.useYn   = useYn;
    }
}
