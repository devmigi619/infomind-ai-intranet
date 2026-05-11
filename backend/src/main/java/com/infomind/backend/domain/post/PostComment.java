package com.infomind.backend.domain.post;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_PST_CMT")
@IdClass(PostCommentId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class PostComment extends BaseEntity {

    @Id
    @Column(name = "BRD_ID", length = 100)
    private String brdId;

    @Id
    @Column(name = "PST_SN")
    private Long pstSn;

    @Id
    @Column(name = "CMT_SN")
    private Integer cmtSn;

    @Column(name = "CMT_LVL")
    @Builder.Default
    private Integer cmtLvl = 1;

    @Column(name = "UP_CMT_SN")
    private Integer upCmtSn;

    @Column(name = "CMT_TTL", length = 300)
    private String cmtTtl;

    @Column(name = "CMT_DESC", columnDefinition = "TEXT")
    private String cmtDesc;

    @Column(name = "USER_ID", length = 100)
    private String userId;

    @Column(name = "DEL_YN", length = 1)
    @Builder.Default
    private String delYn = "N";

    @Column(name = "CMT_DEL_SE", length = 20)
    private String cmtDelSe;

    @Column(name = "LIKE_CNT")
    @Builder.Default
    private Integer likeCnt = 0;

    public void update(String cmtTtl, String cmtDesc) {
        this.cmtTtl = cmtTtl;
        this.cmtDesc = cmtDesc != null ? cmtDesc : this.cmtDesc;
    }

    /** 좋아요 1 증가 */
    public void incrementLike() {
        this.likeCnt = (this.likeCnt != null ? this.likeCnt : 0) + 1;
    }

    /** 소프트 삭제 — deleterType: '관리자삭제' / '본인삭제' */
    public void softDelete(String deleterType) {
        this.delYn = "Y";
        this.cmtDelSe = deleterType;
    }
}
