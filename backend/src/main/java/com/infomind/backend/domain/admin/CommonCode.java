package com.infomind.backend.domain.admin;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_COM_CODE")
@IdClass(CommonCodeId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class CommonCode extends BaseEntity {

    @Id
    @Column(name = "UP_CD", length = 20)
    private String upCd;

    @Id
    @Column(name = "CD", length = 20)
    private String cd;

    @Column(name = "CD_NM", length = 100)
    private String cdNm;

    @Column(name = "CD_LVL")
    private Integer cdLvl;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "CD_ORD")
    private Integer cdOrd;

    @Column(name = "CD_RMK", columnDefinition = "TEXT")
    private String cdRmk;

    @Column(name = "ENG_CD_NM", length = 100)
    private String engCdNm;

    public void update(String cdNm, String useYn, Integer cdOrd, String cdRmk, String engCdNm) {
        this.cdNm = cdNm;
        this.useYn = useYn;
        this.cdOrd = cdOrd;
        this.cdRmk = cdRmk;
        this.engCdNm = engCdNm;
    }

    public void disable() {
        this.useYn = "N";
    }
}
