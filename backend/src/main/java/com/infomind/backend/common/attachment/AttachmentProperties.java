package com.infomind.backend.common.attachment;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 첨부파일 설정값. application.yml의 {@code attachment.*} 키를 타입 안전하게 주입.
 *
 * <ul>
 *   <li>{@code attachment.storage-path}: 파일시스템 저장 루트 (운영기는 별도 결정)</li>
 *   <li>{@code attachment.max-file-size}: 단일 파일 최대 크기 (예: 50MB)</li>
 *   <li>{@code attachment.max-group-size}: 그룹 합산 최대 크기 (예: 200MB)</li>
 *   <li>{@code attachment.blob-threshold}: BLOB 저장 임계값. 초과 시 BLOB, 이하 시 파일시스템.</li>
 *   <li>{@code attachment.allowed-extensions}: 화이트리스트 확장자</li>
 * </ul>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "attachment")
public class AttachmentProperties {

    /** 파일시스템 저장 루트 (로컬 기본값 없음 — application-{profile}.yml에서 지정) */
    private String storagePath;

    /** 단일 파일 최대 크기 */
    private DataSize maxFileSize = DataSize.ofMegabytes(50);

    /** 그룹 합산 최대 크기 */
    private DataSize maxGroupSize = DataSize.ofMegabytes(200);

    /** 이하: 파일시스템 / 초과: BLOB */
    private DataSize blobThreshold = DataSize.ofMegabytes(5);

    /** 허용 확장자 (소문자) */
    private List<String> allowedExtensions = List.of();
}
