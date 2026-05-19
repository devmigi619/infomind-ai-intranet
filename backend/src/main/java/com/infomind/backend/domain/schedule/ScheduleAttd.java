package com.infomind.backend.domain.schedule;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 일정 참석자 엔티티 (INT_SCHD_ATTD).
 *
 * <p>복합 PK: (schdSn, attdUserId)</p>
 */
@Entity
@Table(name = "INT_SCHD_ATTD")
@IdClass(ScheduleAttdId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ScheduleAttd extends BaseEntity {

    @Id
    @Column(name = "SCHD_SN")
    private Long schdSn;

    @Id
    @Column(name = "ATTD_USER_ID", length = 100)
    private String attdUserId;

    /** 참석 여부 — 'Y' / 'N' */
    @Column(name = "USER_ATTD_YN", length = 1, nullable = false)
    @Builder.Default
    private String userAttdYn = "N";

    /** 조회 여부 — 'Y' / 'N' */
    @Column(name = "USER_QRY_YN", length = 1, nullable = false)
    @Builder.Default
    private String userQryYn = "N";

    /** 참석 응답 변경. */
    public void attend(boolean attended) {
        this.userAttdYn = attended ? "Y" : "N";
    }

    /** 조회 마킹. */
    public void markViewed() {
        this.userQryYn = "Y";
    }
}
