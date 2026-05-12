package com.infomind.backend.domain.vehicle;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_VEH_RSV")
@IdClass(VehicleReservationId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class VehicleReservation extends BaseEntity {

    @Id
    @Column(name = "VEH_ID", length = 100)
    private String vehId;

    @Id
    @Column(name = "RSV_SN")
    private Long rsvSn;

    @Column(name = "USER_ID", length = 100, nullable = false)
    private String userId;

    @Column(name = "RSV_ST_YMD", length = 8, nullable = false)
    private String rsvStYmd;    // 시작일 YYYYMMDD

    @Column(name = "RSV_ST_HHMM", length = 4, nullable = false)
    private String rsvStHhmm;   // 시작시각 HHMM

    @Column(name = "RSV_END_YMD", length = 8, nullable = false)
    private String rsvEndYmd;   // 종료일 YYYYMMDD

    @Column(name = "RSV_END_HHMM", length = 4, nullable = false)
    private String rsvEndHhmm;  // 종료시각 HHMM

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    // ── 반납 필드 ─────────────────────────────────────────────────────────

    @Column(name = "RTN_YN", length = 1)
    @Builder.Default
    private String rtnYn = "N";

    @Column(name = "RTN_YMD", length = 8)
    private String rtnYmd;      // 반납일 YYYYMMDD

    @Column(name = "RTN_HHMM", length = 4)
    private String rtnHhmm;     // 반납시각 HHMM

    @Column(name = "RTN_PLC", columnDefinition = "TEXT")
    private String rtnPlc;      // 반납 장소

    // ── 연장 필드 ─────────────────────────────────────────────────────────

    @Column(name = "EXT_YN", length = 1)
    @Builder.Default
    private String extYn = "N";

    @Column(name = "EXT_YMD", length = 8)
    private String extYmd;      // 마지막 연장 종료일 YYYYMMDD

    @Column(name = "EXT_HHMM", length = 4)
    private String extHhmm;     // 마지막 연장 종료시각 HHMM

    // ── 업데이트 메서드 ────────────────────────────────────────────────────

    /** 반납 처리: rtn_yn = 'Y', 반납 일시·장소 기록 + rsv_end를 실제 반납 시각으로 갱신 */
    public void doReturn(String rtnYmd, String rtnHhmm, String rtnPlc) {
        this.rtnYn      = "Y";
        this.rtnYmd     = rtnYmd;
        this.rtnHhmm    = rtnHhmm;
        this.rtnPlc     = rtnPlc;
        // 실제 반납 시각으로 예약 종료 시각 갱신
        this.rsvEndYmd  = rtnYmd;
        this.rsvEndHhmm = rtnHhmm;
    }

    /** 연장 처리: rsv_end 직접 수정 + ext_ 기록 */
    public void extend(String newEndYmd, String newEndHhmm) {
        this.rsvEndYmd  = newEndYmd;
        this.rsvEndHhmm = newEndHhmm;
        this.extYn  = "Y";
        this.extYmd  = newEndYmd;
        this.extHhmm = newEndHhmm;
    }
}
