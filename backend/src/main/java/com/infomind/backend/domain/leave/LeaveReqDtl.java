package com.infomind.backend.domain.leave;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_LEAVE_REQ_DTL")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveReqDtl extends BaseEntity {

    @EmbeddedId
    private LeaveReqDtlId id;

    /** 휴가 시작 시분 HHMM (반일 신청 시에만 사용) */
    @Column(name = "LEAVE_ST_HHMM", length = 4)
    private String leaveStHhmm;

    /** 휴가 종료 시분 HHMM (반일 신청 시에만 사용) */
    @Column(name = "LEAVE_END_HHMM", length = 4)
    private String leaveEndHhmm;
}
