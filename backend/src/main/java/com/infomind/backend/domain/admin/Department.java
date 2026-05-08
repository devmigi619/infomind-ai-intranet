package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_DEPT")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Department extends BaseEntity {

    @Id
    @Column(name = "DEPT_CD", length = 20)
    private String deptCd;

    @Column(name = "UP_DEPT_CD", length = 20)
    private String upDeptCd;

    @Column(name = "DEPT_NM", length = 50)
    private String deptNm;

    @Column(name = "DEPT_LVL")
    private Integer deptLvl;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    public void update(String deptNm, String useYn) {
        this.deptNm = deptNm;
        this.useYn = useYn != null ? useYn : this.useYn;
    }

    public void disable() {
        this.useYn = "N";
    }
}
