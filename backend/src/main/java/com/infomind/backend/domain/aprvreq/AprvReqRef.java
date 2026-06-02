package com.infomind.backend.domain.aprvreq;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_APRV_REQ_REF")
@IdClass(AprvReqRefId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AprvReqRef extends BaseEntity {

    @Id
    @Column(name = "APRV_FORM_ID", length = 100)
    private String aprvFormId;

    @Id
    @Column(name = "REQ_USER_ID", length = 100)
    private String reqUserId;

    @Id
    @Column(name = "APRV_REQ_SN")
    private Long aprvReqSn;

    @Id
    @Column(name = "REF_USER_ID", length = 100)
    private String refUserId;

    @Column(name = "QRY_YN", length = 1)
    @Builder.Default
    private String qryYn = "N";
}
