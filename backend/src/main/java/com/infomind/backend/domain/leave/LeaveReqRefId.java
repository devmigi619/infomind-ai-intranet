package com.infomind.backend.domain.leave;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveReqRefId implements Serializable {

    @Column(name = "REQ_USER_ID", length = 100)
    private String reqUserId;

    @Column(name = "REQ_SN")
    private Long reqSn;

    @Column(name = "REF_USER_ID", length = 100)
    private String refUserId;
}
