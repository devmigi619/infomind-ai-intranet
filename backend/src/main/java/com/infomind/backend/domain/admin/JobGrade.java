package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_JBGD")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class JobGrade extends BaseEntity {

    @Id
    @Column(name = "JBGD_CD", length = 20)
    private String jbgdCd;

    @Column(name = "JBGD_NM", length = 100)
    private String jbgdNm;

    @Column(name = "JBGD_SN")
    private Integer jbgdSn;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    public void update(String jbgdNm, Integer jbgdSn, String useYn, String rmk) {
        this.jbgdNm = jbgdNm;
        this.jbgdSn = jbgdSn;
        this.useYn = useYn != null ? useYn : this.useYn;
        this.rmk = rmk;
    }

    public void disable() {
        this.useYn = "N";
    }
}
