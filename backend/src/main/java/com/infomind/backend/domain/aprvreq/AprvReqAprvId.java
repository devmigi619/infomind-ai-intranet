package com.infomind.backend.domain.aprvreq;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AprvReqAprvId implements Serializable {
    private String aprvFormId;
    private String reqUserId;
    private Long aprvReqSn;
    private String aprvUserId;
}
