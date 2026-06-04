package com.infomind.backend.domain.report;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportDescId implements Serializable {
    private String rptFormId;
    private Long roundSn;
    private String userId;
}
