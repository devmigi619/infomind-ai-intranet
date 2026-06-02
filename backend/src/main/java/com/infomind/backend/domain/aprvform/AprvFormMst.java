package com.infomind.backend.domain.aprvform;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_APRV_FORM_MST")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AprvFormMst extends BaseEntity {

    @Id
    @Column(name = "APRV_FORM_ID", length = 100)
    private String aprvFormId;

    @Column(name = "APRV_FORM_NM", length = 100, nullable = false)
    private String aprvFormNm;

    @Column(name = "FILE_YN", length = 1, nullable = false)
    @Builder.Default
    private String fileYn = "N";

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    @Column(name = "DEL_YN", length = 1, nullable = false)
    @Builder.Default
    private String delYn = "N";

    public void update(String aprvFormNm, String fileYn, String rmk) {
        this.aprvFormNm = aprvFormNm;
        this.fileYn = fileYn != null ? fileYn : this.fileYn;
        this.rmk = rmk;
    }

    public void delete() {
        this.delYn = "Y";
    }
}
