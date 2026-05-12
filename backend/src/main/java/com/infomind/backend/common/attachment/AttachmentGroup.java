package com.infomind.backend.common.attachment;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "int_com_file_grp")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AttachmentGroup extends BaseEntity {

    @Id
    @Column(name = "afile_id", length = 100)
    private String afileId;
}
