package com.infomind.backend.domain.schedule;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 반복 일정 예외 엔티티 (INT_SCHD_EXCP).
 *
 * <p>복합 PK: (schdSn, excpYmd)</p>
 * <ul>
 *   <li>{@code endYn = 'Y'}: 해당 날짜 이후 반복 종료</li>
 *   <li>{@code endYn = 'N'}: 해당 날짜만 건너뜀 (skip)</li>
 * </ul>
 */
@Entity
@Table(name = "INT_SCHD_EXCP")
@IdClass(ScheduleExcpId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ScheduleExcp extends BaseEntity {

    @Id
    @Column(name = "SCHD_SN")
    private Long schdSn;

    /** 예외 날짜 (YYYYMMDD). */
    @Id
    @Column(name = "EXCP_YMD", length = 8)
    private String excpYmd;

    /** 'Y' 이면 이 날짜 이후 반복 종료. 'N' 이면 이 날짜만 skip. */
    @Column(name = "END_YN", length = 1, nullable = false)
    @Builder.Default
    private String endYn = "N";

    /** 이 예외가 반복 종료 마커인지 여부. */
    public boolean isEnd() {
        return "Y".equalsIgnoreCase(endYn);
    }

    /** 같은 발생일의 skip 예외를 이후 종료 마커로 승격할 때 사용. */
    public void markEnd() {
        this.endYn = "Y";
    }
}
