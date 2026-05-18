package com.infomind.backend.domain.aprvltmpl;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_USER_APRVL")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class UserAprvlTmpl extends BaseEntity {

    @EmbeddedId
    private UserAprvlTmplId id;

    /** 결재선 템플릿명 */
    @Column(name = "APRVL_NM", length = 100, nullable = false)
    private String aprvlNm;

    /** 부서원 자동 참조 여부 */
    @Column(name = "DEPT_REF_YN", length = 1)
    @Builder.Default
    private String deptRefYn = "N";

    /** 사용 여부 */
    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    /** 비고 */
    @Column(name = "RMK", columnDefinition = "text")
    private String rmk;

    public void update(String aprvlNm) {
        this.aprvlNm = aprvlNm;
    }
}
