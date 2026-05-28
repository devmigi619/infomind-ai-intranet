package com.infomind.backend.domain.chat;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "INT_CHAT_HISTORY")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ChatHistory extends BaseEntity {

    @EmbeddedId
    private ChatHistoryId id;

    /** 대화 구분: U=사용자, A=어시스턴트 */
    @Column(name = "CHAT_SE", length = 20, nullable = false)
    private String chatSe;

    /** 대화 내용 */
    @Column(name = "CHAT_DESC", columnDefinition = "TEXT", nullable = false)
    private String chatDesc;

    /** 그라운딩 여부 Y/N */
    @Column(name = "GRDL_YN", length = 1)
    @Builder.Default
    private String grdlYn = "N";

    /** 그라운딩 코드 */
    @Column(name = "GRDL_CD", length = 20)
    private String grdlCd;

    /** 연관 메뉴 ID */
    @Column(name = "MENU_ID", length = 100)
    private String menuId;

    /** 첨부파일 그룹 ID */
    @Column(name = "AFILE_ID", length = 100)
    private String afileId;

    /** 토큰 사용량 */
    @Column(name = "TK_USE_CNT")
    @Builder.Default
    private Integer tkUseCnt = 0;

    /** 대화 일시 */
    @Column(name = "CHAT_DT", nullable = false)
    private LocalDateTime chatDt;

    /** 삭제 여부 Y/N (소프트 삭제) */
    @Column(name = "DEL_YN", length = 1, nullable = false)
    @Builder.Default
    private String delYn = "N";

    public void softDelete() {
        this.delYn = "Y";
    }
}
