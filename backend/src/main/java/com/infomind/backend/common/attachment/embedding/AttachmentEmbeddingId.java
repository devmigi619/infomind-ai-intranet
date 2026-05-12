package com.infomind.backend.common.attachment.embedding;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentEmbeddingId implements Serializable {
    private String afileId;
    private Integer afileSn;
    private String embId;
}
