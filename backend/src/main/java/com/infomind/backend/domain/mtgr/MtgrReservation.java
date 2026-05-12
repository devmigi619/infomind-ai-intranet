package com.infomind.backend.domain.mtgr;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_MTGR_RSV")
@IdClass(MtgrReservationId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class MtgrReservation extends BaseEntity {

    @Id
    @Column(name = "MTGR_ID", length = 100)
    private String mtgrId;

    @Id
    @Column(name = "RSV_SN")
    private Long rsvSn;

    @Column(name = "USER_ID", length = 100, nullable = false)
    private String userId;

    @Column(name = "RSV_ST_YMD", length = 8, nullable = false)
    private String rsvStYmd;

    @Column(name = "RSV_ST_HHMM", length = 4, nullable = false)
    private String rsvStHhmm;

    @Column(name = "RSV_END_YMD", length = 8, nullable = false)
    private String rsvEndYmd;

    @Column(name = "RSV_END_HHMM", length = 4, nullable = false)
    private String rsvEndHhmm;

    @Column(name = "EXT_YN", length = 1, nullable = false)
    @Builder.Default
    private String extYn = "N";

    @Column(name = "EXT_YMD", length = 8)
    private String extYmd;

    @Column(name = "EXT_HHMM", length = 4)
    private String extHhmm;

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    /** 연장 처리 */
    public void extend(String newEndYmd, String newEndHhmm) {
        this.rsvEndYmd = newEndYmd;
        this.rsvEndHhmm = newEndHhmm;
        this.extYn = "Y";
        this.extYmd = newEndYmd;
        this.extHhmm = newEndHhmm;
    }
}
