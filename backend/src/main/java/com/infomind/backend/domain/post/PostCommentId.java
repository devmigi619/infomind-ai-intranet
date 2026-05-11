package com.infomind.backend.domain.post;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostCommentId implements Serializable {
    private String brdId;
    private Long pstSn;
    private Integer cmtSn;
}
