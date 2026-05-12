package com.infomind.backend.domain.vehicle;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_VEH")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Vehicle extends BaseEntity {

    @Id
    @Column(name = "VEH_ID", length = 100)
    private String vehId;

    @Column(name = "VEH_NM", length = 50, nullable = false)
    private String vehNm;

    @Column(name = "VEH_NO", length = 50, nullable = false)
    private String vehNo;

    @Column(name = "VEH_SE", length = 20)
    private String vehSe;   // 차량구분 (공통코드 참조)

    @Column(name = "DEPT_CD", length = 20)
    private String deptCd;  // 소속 부서 (null = 전사 공용)

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";
}
