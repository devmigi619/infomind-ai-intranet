package com.infomind.backend.common.attachment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentId implements Serializable {
    private String afileId;
    private Integer afileSn;
}
