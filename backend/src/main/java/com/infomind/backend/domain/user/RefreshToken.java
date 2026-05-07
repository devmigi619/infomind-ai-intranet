package com.infomind.backend.domain.user;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "INT_RF_TK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class RefreshToken extends BaseEntity {

    @Id
    @Column(name = "TK_ID", length = 50)
    private String tkId;            // UUID

    @Column(name = "USER_ID", length = 100, nullable = false)
    private String userId;

    @Column(name = "TK", columnDefinition = "TEXT", nullable = false)
    private String tk;

    @Column(name = "TK_EXP_DT", nullable = false)
    private LocalDateTime tkExpDt;

    @Column(name = "RVK_YN", length = 1, nullable = false)
    @Builder.Default
    private String rvkYn = "N";

    @Column(name = "IP_ADDR", length = 40)
    private String ipAddr;

    public void revoke() {
        this.rvkYn = "Y";
    }
}
