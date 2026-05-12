package com.infomind.backend.common.attachment.embedding;

import com.pgvector.PGvector;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.sql.SQLException;

/**
 * {@link PGvector} ↔ {@code String} 변환.
 *
 * <p>Hibernate 6은 {@code PGvector} 타입을 직접 모르기 때문에 명시 컨버터로 박는다.
 * 컬럼 타입은 PostgreSQL {@code vector(1024)} — 텍스트 표현은 {@code [0.1,0.2,...]}.
 * INSERT 시 SQL은 {@code ?::vector}로 캐스팅(엔티티의 {@code @ColumnTransformer} 참고).</p>
 */
@Converter(autoApply = false)
public class PGvectorConverter implements AttributeConverter<PGvector, String> {

    @Override
    public String convertToDatabaseColumn(PGvector attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public PGvector convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            PGvector v = new PGvector();
            v.setValue(dbData);
            return v;
        } catch (SQLException e) {
            return null;
        }
    }
}
