package com.infomind.backend.domain.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveDtlId implements Serializable {

    @Column(name = "LEAVE_CD", length = 20)
    private String leaveCd;

    @Column(name = "LEAVE_DTL_CD", length = 20)
    private String leaveDtlCd;
}
