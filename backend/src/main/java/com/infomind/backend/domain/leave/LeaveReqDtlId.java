package com.infomind.backend.domain.leave;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveReqDtlId implements Serializable {

    @Column(name = "REQ_USER_ID", length = 100)
    private String reqUserId;

    @Column(name = "REQ_SN")
    private Long reqSn;

    /** 사용일자 YYYYMMDD */
    @Column(name = "LEAVE_USE_YMD", length = 8)
    private String leaveUseYmd;
}
