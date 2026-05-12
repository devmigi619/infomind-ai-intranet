package com.infomind.backend.common.attachment;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "int_com_file")
@IdClass(AttachmentId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Attachment extends BaseEntity {

    @Id
    @Column(name = "afile_id", length = 100)
    private String afileId;

    @Id
    @Column(name = "afile_sn")
    private Integer afileSn;

    @Column(name = "file_path", length = 400)
    private String filePath;

    @Column(name = "file_nm", length = 300)
    private String fileNm;

    @Column(name = "ori_file_nm", length = 300)
    private String oriFileNm;

    @Column(name = "webp_file_nm", length = 300)
    private String webpFileNm;

    @Column(name = "webp_file_path", length = 400)
    private String webpFilePath;

    @Column(name = "file_ext", length = 100)
    private String fileExt;

    @Column(name = "file_desc", columnDefinition = "TEXT")
    private String fileDesc;

    @Column(name = "file_sz")
    private BigDecimal fileSz;

    @Column(name = "rep_file_yn", length = 1)
    @Builder.Default
    private String repFileYn = "N";

    @Column(name = "del_yn", length = 1)
    @Builder.Default
    private String delYn = "N";
}
