package com.infomind.backend.domain.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommonCodeId implements Serializable {
    private String upCd;
    private String cd;
}
