package com.infomind.backend.domain.report;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportRoundId implements Serializable {
    private String rptFormId;
    private Long roundSn;
}
