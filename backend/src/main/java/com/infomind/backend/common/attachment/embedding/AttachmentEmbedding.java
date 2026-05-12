package com.infomind.backend.common.attachment.embedding;

import com.infomind.backend.common.BaseEntity;
import com.pgvector.PGvector;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "int_com_file_emb")
@IdClass(AttachmentEmbeddingId.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AttachmentEmbedding extends BaseEntity {

    @Id
    @Column(name = "afile_id", length = 100)
    private String afileId;

    @Id
    @Column(name = "afile_sn")
    private Integer afileSn;

    @Id
    @Column(name = "emb_id", length = 50)
    private String embId;

    // PGvector ↔ String 변환 + INSERT/UPDATE 시 ?::vector 캐스팅으로 PostgreSQL vector 컬럼에 박음.
    @Convert(converter = PGvectorConverter.class)
    @ColumnTransformer(write = "?::vector")
    @Column(name = "emb_rslt", columnDefinition = "vector(1024)")
    private PGvector embRslt;

    @Column(name = "emb_ttl", length = 300)
    private String embTtl;

    @Column(name = "emb_model", length = 50)
    private String embModel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tag_rslt", columnDefinition = "jsonb")
    private Map<String, Object> tagRslt;

    @Column(name = "ori_desc", columnDefinition = "TEXT")
    private String oriDesc;
}
