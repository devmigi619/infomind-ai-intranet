package com.infomind.backend.domain.aprvltmpl;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_USER_APRVL_APRV")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class UserAprvlTmplAprv {

    @EmbeddedId
    private UserAprvlTmplAprvId id;

    /** 결재 순서 */
    @Column(name = "APRV_ORD")
    private Integer aprvOrd;

    /** 비고 */
    @Column(name = "RMK", columnDefinition = "text")
    private String rmk;
}
