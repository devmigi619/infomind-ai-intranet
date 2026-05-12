package com.infomind.backend.domain.mtgr;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_MTGR")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Mtgr extends BaseEntity {

    @Id
    @Column(name = "MTGR_ID", length = 100)
    private String mtgrId;

    @Column(name = "MTGR_NM", length = 50, nullable = false)
    private String mtgrNm;

    @Column(name = "MTGR_PLC", length = 100, nullable = false)
    private String mtgrPlc;

    @Column(name = "MTGR_SE", length = 20)
    private String mtgrSe; // G: General, D: Department

    @Column(name = "DEPT_CD", length = 20)
    private String deptCd;

    @Column(name = "USE_YN", length = 1, nullable = false)
    @Builder.Default
    private String useYn = "Y";
}
