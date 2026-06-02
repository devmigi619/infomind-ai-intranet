package com.infomind.backend.domain.aprvform;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AprvFormDtlId implements Serializable {
    private String aprvFormId;
    private String aprvRefCd;
}
