package com.infomind.backend.domain.leave;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_LEAVE_REQ_REF")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaveReqRef extends BaseEntity {

    @EmbeddedId
    private LeaveReqRefId id;

    /** 조회 여부 Y/N */
    @Column(name = "QRY_YN", length = 1)
    @Builder.Default
    private String qryYn = "N";

    public void markRead() {
        this.qryYn = "Y";
    }
}
