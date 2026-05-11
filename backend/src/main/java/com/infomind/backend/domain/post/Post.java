package com.infomind.backend.domain.post;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_PST")
@IdClass(PostId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Post extends BaseEntity {

    @Id
    @Column(name = "BRD_ID", length = 100)
    private String brdId;

    @Id
    @Column(name = "PST_SN")
    private Long pstSn;

    @Column(name = "PST_TTL", length = 300)
    private String pstTtl;

    @Column(name = "PST_DESC", columnDefinition = "TEXT")
    private String pstDesc;

    @Column(name = "USER_ID", length = 100)
    private String userId;

    @Column(name = "NTC_YN", length = 1)
    @Builder.Default
    private String ntcYn = "N";

    @Column(name = "DEL_YN", length = 1)
    @Builder.Default
    private String delYn = "N";

    @Column(name = "PST_DEL_SE", length = 20)
    private String pstDelSe;

    @Column(name = "QRY_CNT")
    @Builder.Default
    private Integer qryCnt = 0;

    @Column(name = "LIKE_NUM")
    @Builder.Default
    private Integer likeNum = 0;

    @Column(name = "PST_RMK", columnDefinition = "TEXT")
    private String pstRmk;

    @Column(name = "PST_ORD")
    private Integer pstOrd;

    @Column(name = "PUB_ST_YMD", length = 8)
    private String pubStYmd;

    @Column(name = "PUB_END_YMD", length = 8)
    private String pubEndYmd;

    /** 첨부 그룹 ID — 외래 매핑 없이 String으로만 보관 (이번 작업 범위 외) */
    @Column(name = "AFILE_ID", length = 100)
    private String afileId;

    public void update(String pstTtl, String pstDesc, String ntcYn, String pstRmk,
                       Integer pstOrd, String pubStYmd, String pubEndYmd, String afileId) {
        this.pstTtl = pstTtl != null ? pstTtl : this.pstTtl;
        this.pstDesc = pstDesc != null ? pstDesc : this.pstDesc;
        this.ntcYn = ntcYn != null ? ntcYn : this.ntcYn;
        this.pstRmk = pstRmk;
        this.pstOrd = pstOrd;
        this.pubStYmd = pubStYmd;
        this.pubEndYmd = pubEndYmd;
        this.afileId = afileId;
    }

    /** 조회수 1 증가 */
    public void incrementQryCnt() {
        this.qryCnt = (this.qryCnt != null ? this.qryCnt : 0) + 1;
    }

    /** 좋아요 1 증가 */
    public void incrementLike() {
        this.likeNum = (this.likeNum != null ? this.likeNum : 0) + 1;
    }

    /** 소프트 삭제 — deleterType: '관리자삭제' / '작성자삭제' */
    public void softDelete(String deleterType) {
        this.delYn = "Y";
        this.pstDelSe = deleterType;
    }
}
