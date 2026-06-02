package com.infomind.backend.domain.aprvform;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_APRV_FORM_DTL")
@IdClass(AprvFormDtlId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AprvFormDtl extends BaseEntity {

    @Id
    @Column(name = "APRV_FORM_ID", length = 100)
    private String aprvFormId;

    @Id
    @Column(name = "APRV_REF_CD", length = 20)
    private String aprvRefCd;

    @Column(name = "APRV_REF_NM", length = 100, nullable = false)
    private String aprvRefNm;

    @Column(name = "APRV_REF_SE", length = 20)
    private String aprvRefSe;

    @Column(name = "REQD_YN", length = 1, nullable = false)
    @Builder.Default
    private String reqdYn = "N";

    @Column(name = "DEL_YN", length = 1, nullable = false)
    @Builder.Default
    private String delYn = "N";
}
