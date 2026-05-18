package com.infomind.backend.domain.aprvltmpl;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAprvlTmplAprvId implements Serializable {

    @Column(name = "APRVL_ID", length = 50)
    private String aprvlId;

    @Column(name = "USER_ID", length = 100)
    private String userId;

    @Column(name = "APRV_USER_ID", length = 100)
    private String aprvUserId;
}
