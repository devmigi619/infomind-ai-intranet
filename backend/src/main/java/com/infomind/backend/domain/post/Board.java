package com.infomind.backend.domain.post;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_BRD")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Board extends BaseEntity {

    @Id
    @Column(name = "BRD_ID", length = 100)
    private String brdId;

    @Column(name = "BRD_SE", length = 20)
    private String brdSe;

    @Column(name = "BRD_NM", length = 100)
    private String brdNm;

    @Column(name = "BRD_DESC", columnDefinition = "TEXT")
    private String brdDesc;

    @Column(name = "DEPT_CD", length = 20)
    private String deptCd;

    @Column(name = "ORD")
    private Integer ord;

    @Column(name = "FILE_USE_YN", length = 1)
    @Builder.Default
    private String fileUseYn = "Y";

    @Column(name = "CMT_USE_YN", length = 1)
    @Builder.Default
    private String cmtUseYn = "Y";

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    public void update(String brdSe, String brdNm, String brdDesc, String deptCd,
                       Integer ord, String fileUseYn, String cmtUseYn, String useYn) {
        this.brdSe = brdSe != null ? brdSe : this.brdSe;
        this.brdNm = brdNm != null ? brdNm : this.brdNm;
        this.brdDesc = brdDesc;
        this.deptCd = deptCd;
        this.ord = ord;
        this.fileUseYn = fileUseYn != null ? fileUseYn : this.fileUseYn;
        this.cmtUseYn = cmtUseYn != null ? cmtUseYn : this.cmtUseYn;
        this.useYn = useYn != null ? useYn : this.useYn;
    }

    public void disable() {
        this.useYn = "N";
    }
}
