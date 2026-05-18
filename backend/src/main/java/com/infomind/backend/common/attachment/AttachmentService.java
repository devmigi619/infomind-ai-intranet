package com.infomind.backend.common.attachment;

import com.infomind.backend.common.attachment.embedding.EmbeddingTriggerService;
import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 첨부파일 도메인 핵심 서비스.
 *
 * <p>업로드, 다운로드, 메타 조회, 소프트 삭제를 담당하며 도메인별 권한 판단은
 * {@link AttachmentAuthorizer} 구현체에 위임한다.</p>
 *
 * <p>저장 정책:
 * <ul>
 *   <li>모든 파일의 메타는 {@code int_com_file}에 등록(마스터, FK 부모)</li>
 *   <li>{@code file.size <= blob-threshold(5MB)} → 파일시스템 디스크에 데이터 저장</li>
 *   <li>{@code file.size > blob-threshold(5MB)} → {@code int_com_file_blob}에 BLOB로 데이터 저장</li>
 * </ul>
 * 작은 파일은 디스크로 빼서 DB 부담을 줄이고, 큰 파일은 BLOB로 보관해 백업·이동 시 일관성을 챙김.</p>
 */
@Slf4j
@Service
public class AttachmentService {

    private static final DateTimeFormatter ID_TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Set<String> IMAGE_EXTS = Set.of("jpg", "jpeg", "png", "gif");

    private final AttachmentGroupRepository groupRepository;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentBlobRepository blobRepository;
    private final AttachmentProperties properties;
    private final Map<String, AttachmentAuthorizer> authorizers;
    private final EmbeddingTriggerService embeddingTriggerService;
    private final Tika tika = new Tika();

    public AttachmentService(AttachmentGroupRepository groupRepository,
                             AttachmentRepository attachmentRepository,
                             AttachmentBlobRepository blobRepository,
                             AttachmentProperties properties,
                             List<AttachmentAuthorizer> authorizerList,
                             EmbeddingTriggerService embeddingTriggerService) {
        this.groupRepository = groupRepository;
        this.attachmentRepository = attachmentRepository;
        this.blobRepository = blobRepository;
        this.properties = properties;
        this.authorizers = authorizerList.stream()
                .collect(Collectors.toMap(AttachmentAuthorizer::supportedPrefix, Function.identity()));
        this.embeddingTriggerService = embeddingTriggerService;
    }

    // ─── 업로드 ────────────────────────────────────────────────────────────

    /**
     * 멀티파일 업로드.
     *
     * @param files 업로드할 파일들 (1개 이상)
     * @param afileId 기존 그룹 ID — null이면 새 그룹 생성
     * @param prefix afileId 생성 시 사용할 도메인 prefix (예: "BRD") — afileId가 있으면 무시
     * @return 그룹 ID + 등록된 파일 메타 리스트
     */
    @Transactional
    public UploadResponse upload(MultipartFile[] files, String afileId, String prefix) {
        return upload(files, afileId, prefix, true);
    }

    @Transactional
    public UploadResponse upload(MultipartFile[] files, String afileId, String prefix, boolean embedEnabled) {
        if (files == null || files.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }

        // 그룹 결정/생성
        String groupId;
        int startSn;
        long existingGroupSize = 0L;
        if (afileId == null || afileId.isBlank()) {
            if (prefix == null || prefix.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "신규 그룹 생성 시 prefix가 필요합니다.");
            }
            groupId = generateAfileId(prefix);
            groupRepository.save(AttachmentGroup.builder().afileId(groupId).build());
            startSn = 1;
        } else {
            groupId = afileId;
            if (groupRepository.findById(groupId).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "첨부 그룹을 찾을 수 없습니다: " + groupId);
            }
            // 기존 파일들 — 다음 sn 계산 + 그룹 누적 크기 합산 (활성만)
            List<Attachment> existing = attachmentRepository
                    .findByAfileIdAndDelYnOrderByAfileSnAsc(groupId, "N");
            startSn = existing.stream().mapToInt(Attachment::getAfileSn).max().orElse(0) + 1;
            existingGroupSize = existing.stream()
                    .map(a -> a.getFileSz() != null ? a.getFileSz().longValue() : 0L)
                    .mapToLong(Long::longValue).sum();
        }

        long maxFileSize = properties.getMaxFileSize().toBytes();
        long maxGroupSize = properties.getMaxGroupSize().toBytes();
        long blobThreshold = properties.getBlobThreshold().toBytes();

        long runningGroupSize = existingGroupSize;
        List<FileMeta> results = new ArrayList<>();
        // 임베딩 트리거에 넘길 스냅샷 — saveToFileSystem()의 transferTo()가 임시파일을 이동시키므로 save 이전에 캡쳐
        List<byte[]> bytesSnapshots = new ArrayList<>(files.length);
        List<String> fileNameSnapshots = new ArrayList<>(files.length);

        for (int i = 0; i < files.length; i++) {
            MultipartFile mf = files[i];
            validateFile(mf, maxFileSize);

            runningGroupSize += mf.getSize();
            if (runningGroupSize > maxGroupSize) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                        "그룹 합산 용량 한도(" + properties.getMaxGroupSize() + ")를 초과합니다.");
            }

            int sn = startSn + i;
            String oriName = mf.getOriginalFilename() != null ? mf.getOriginalFilename() : "unknown";
            String ext = extractExtension(oriName);

            // 임베딩용 바이트 스냅샷을 save 이전에 추출 (transferTo 이후엔 임시파일이 사라짐)
            try {
                bytesSnapshots.add(mf.getBytes());
                fileNameSnapshots.add(mf.getOriginalFilename());
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "파일 읽기 실패: " + oriName, e);
            }

            try {
                if (mf.getSize() > blobThreshold) {
                    results.add(saveToBlob(groupId, sn, mf, oriName, ext));
                } else {
                    results.add(saveToFileSystem(groupId, sn, mf, oriName, ext));
                }
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "파일 저장 실패: " + oriName, e);
            }
        }

        // 비동기 임베딩 트리거 — 위에서 캡쳐한 bytes/fileName 스냅샷 사용
        if (embedEnabled) {
            for (int i = 0; i < files.length; i++) {
                FileMeta meta = results.get(i);
                embeddingTriggerService.triggerEmbedding(
                        bytesSnapshots.get(i),
                        fileNameSnapshots.get(i),
                        meta.getAfileId(),
                        meta.getAfileSn() != null ? meta.getAfileSn().longValue() : null);
            }
        }

        return UploadResponse.builder()
                .afileId(groupId)
                .files(results)
                .build();
    }

    // ─── 다운로드 ──────────────────────────────────────────────────────────

    /**
     * 파일 다운로드. int_com_file에서 메타를 조회 후 file_path가 "blob:/"로 시작하면
     * int_com_file_blob에서, 아니면 파일시스템에서 데이터를 읽어 반환.
     */
    @Transactional(readOnly = true)
    public DownloadResult download(String afileId, Integer afileSn, String userId) {
        authorize(afileId, userId);

        Attachment a = attachmentRepository.findById(new AttachmentId(afileId, afileSn))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다."));
        if ("Y".equals(a.getDelYn())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제된 파일입니다.");
        }

        byte[] bytes;
        if (a.getFilePath() != null && a.getFilePath().startsWith("blob:/")) {
            AttachmentBlob b = blobRepository.findById(new AttachmentId(afileId, afileSn))
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "BLOB 데이터를 찾을 수 없습니다."));
            bytes = b.getFileBlob() != null ? b.getFileBlob() : new byte[0];
        } else {
            try {
                bytes = Files.readAllBytes(Paths.get(a.getFilePath()));
            } catch (IOException e) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "파일 읽기 실패", e);
            }
        }

        return DownloadResult.builder()
                .fileName(a.getOriFileNm())
                .contentType(detectContentTypeFromName(a.getOriFileNm()))
                .resource(new ByteArrayResource(bytes))
                .size(bytes.length)
                .build();
    }

    // ─── 메타 조회 ─────────────────────────────────────────────────────────

    /**
     * 그룹의 활성 파일 메타 목록. int_com_file이 마스터이므로 거기만 조회.
     * BLOB 데이터(file_blob)는 제외하고 메타만 반환.
     */
    @Transactional(readOnly = true)
    public List<FileMeta> getFiles(String afileId, String userId) {
        authorize(afileId, userId);
        return attachmentRepository.findByAfileIdAndDelYnOrderByAfileSnAsc(afileId, "N")
                .stream().map(this::toMeta).collect(Collectors.toList());
    }

    // ─── 소프트 삭제 ───────────────────────────────────────────────────────

    /**
     * 단일 파일 소프트 삭제. int_com_file 메타에 del_yn='Y' 표시하고,
     * BLOB 파일이면 int_com_file_blob도 같이. 디스크 파일은 즉시 삭제하지 않음(일괄 정리 잡 대상).
     */
    @Transactional
    public void softDelete(String afileId, Integer afileSn, String userId) {
        authorize(afileId, userId);

        Attachment a = attachmentRepository.findById(new AttachmentId(afileId, afileSn))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다."));

        attachmentRepository.save(Attachment.builder()
                .afileId(a.getAfileId())
                .afileSn(a.getAfileSn())
                .filePath(a.getFilePath())
                .fileNm(a.getFileNm())
                .oriFileNm(a.getOriFileNm())
                .webpFileNm(a.getWebpFileNm())
                .webpFilePath(a.getWebpFilePath())
                .fileExt(a.getFileExt())
                .fileDesc(a.getFileDesc())
                .fileSz(a.getFileSz())
                .repFileYn(a.getRepFileYn())
                .delYn("Y")
                .build());

        if (a.getFilePath() != null && a.getFilePath().startsWith("blob:/")) {
            blobRepository.findById(new AttachmentId(afileId, afileSn)).ifPresent(b ->
                    blobRepository.save(AttachmentBlob.builder()
                            .afileId(b.getAfileId())
                            .afileSn(b.getAfileSn())
                            .fileBlob(b.getFileBlob())
                            .filePath(b.getFilePath())
                            .fileNm(b.getFileNm())
                            .oriFileNm(b.getOriFileNm())
                            .fileDesc(b.getFileDesc())
                            .fileSz(b.getFileSz())
                            .delYn("Y")
                            .build()));
        }
    }

    /**
     * 그룹 전체 소프트 삭제. 게시글 삭제 시 PostService에서 호출.
     * int_com_file의 모든 활성 메타를 del_yn='Y' 처리하고, BLOB 파일이면 int_com_file_blob도 같이.
     */
    @Transactional
    public void softDeleteGroup(String afileId) {
        if (afileId == null || afileId.isBlank()) {
            return;
        }
        attachmentRepository.findByAfileIdAndDelYnOrderByAfileSnAsc(afileId, "N")
                .forEach(a -> {
                    attachmentRepository.save(Attachment.builder()
                            .afileId(a.getAfileId())
                            .afileSn(a.getAfileSn())
                            .filePath(a.getFilePath())
                            .fileNm(a.getFileNm())
                            .oriFileNm(a.getOriFileNm())
                            .webpFileNm(a.getWebpFileNm())
                            .webpFilePath(a.getWebpFilePath())
                            .fileExt(a.getFileExt())
                            .fileDesc(a.getFileDesc())
                            .fileSz(a.getFileSz())
                            .repFileYn(a.getRepFileYn())
                            .delYn("Y")
                            .build());

                    if (a.getFilePath() != null && a.getFilePath().startsWith("blob:/")) {
                        blobRepository.findById(new AttachmentId(a.getAfileId(), a.getAfileSn()))
                                .ifPresent(b -> blobRepository.save(AttachmentBlob.builder()
                                        .afileId(b.getAfileId())
                                        .afileSn(b.getAfileSn())
                                        .fileBlob(b.getFileBlob())
                                        .filePath(b.getFilePath())
                                        .fileNm(b.getFileNm())
                                        .oriFileNm(b.getOriFileNm())
                                        .fileDesc(b.getFileDesc())
                                        .fileSz(b.getFileSz())
                                        .delYn("Y")
                                        .build()));
                    }
                });
    }

    // ─── 내부 헬퍼 ─────────────────────────────────────────────────────────

    /** afileId 생성: {PREFIX}_{yyyyMMddHHmmss}_{UUID앞8자} */
    private String generateAfileId(String prefix) {
        String ts = LocalDateTime.now().format(ID_TS);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return prefix + "_" + ts + "_" + suffix;
    }

    /** afileId에서 prefix 추출 */
    private String extractPrefix(String afileId) {
        if (afileId == null) return null;
        int idx = afileId.indexOf('_');
        return idx > 0 ? afileId.substring(0, idx) : afileId;
    }

    /** 권한 체크. 거부 시 403. */
    private void authorize(String afileId, String userId) {
        if (afileId == null || afileId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "afileId가 필요합니다.");
        }
        String prefix = extractPrefix(afileId);
        AttachmentAuthorizer authorizer = authorizers.get(prefix);
        if (authorizer == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "처리할 수 없는 첨부 도메인입니다: " + prefix);
        }
        if (!authorizer.canAccess(userId, afileId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        }
    }

    /** 크기/확장자/MIME 검증. 위반 시 400. */
    private void validateFile(MultipartFile mf, long maxFileSize) {
        if (mf.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "빈 파일은 업로드할 수 없습니다.");
        }
        if (mf.getSize() > maxFileSize) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "파일 크기 한도(" + properties.getMaxFileSize() + ")를 초과합니다.");
        }
        String oriName = mf.getOriginalFilename();
        if (oriName == null || oriName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일명이 비어 있습니다.");
        }
        String ext = extractExtension(oriName);
        if (ext.isEmpty() || !properties.getAllowedExtensions().contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "허용되지 않은 확장자입니다: " + ext);
        }

        // Tika MIME 검증 — 확장자와 실제 내용이 일치해야 함 (위변조 차단)
        // detected = 실제 바이트 기반, byName = 파일명/확장자 기반. 두 결과가 같거나
        // zip-패밀리 호환이면 통과.
        try {
            String detected = tika.detect(mf.getInputStream(), oriName);
            String byName = tika.detect(oriName);
            if (detected != null && byName != null
                    && !detected.equals(byName)
                    && !isCompatibleMime(detected, byName)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "확장자와 실제 내용이 일치하지 않습니다.");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "MIME 검증 실패: " + e.getMessage());
        }
    }

    /** zip/docx 등 일부 호환 MIME 허용 (둘 다 application/zip 계열) */
    private boolean isCompatibleMime(String a, String b) {
        // zip 컨테이너 기반 포맷(docx, xlsx, pptx) — Tika가 application/zip으로 떨어질 수 있음
        Set<String> zipFamily = Set.of(
                "application/zip",
                "application/x-tika-ooxml",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        if (zipFamily.contains(a) && zipFamily.contains(b)) return true;
        // 일반 텍스트 vs application/x-tika-ooxml 등 부분 일치 케이스 — 보수적으로 차단
        return false;
    }

    private String extractExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) return "";
        return fileName.substring(idx + 1).toLowerCase(Locale.ROOT);
    }

    private String detectContentTypeFromName(String name) {
        if (name == null) return "application/octet-stream";
        try {
            return tika.detect(name);
        } catch (Exception e) {
            return "application/octet-stream";
        }
    }

    /** 파일시스템 저장: {storage}/yyyy/MM/{afileId}_{sn}_{원본명} */
    private FileMeta saveToFileSystem(String afileId, int sn, MultipartFile mf,
                                      String oriName, String ext) throws IOException {
        String storagePath = properties.getStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "attachment.storage-path가 설정되지 않았습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        String yyyy = String.format("%04d", now.getYear());
        String mm = String.format("%02d", now.getMonthValue());

        // toAbsolutePath() 필수: MultipartFile.transferTo()는 상대 경로면 Tomcat work directory
        // 기준으로 해석하기 때문에 절대 경로로 통일해야 createDirectories와 transferTo가
        // 같은 위치를 가리킨다.
        Path dir = Paths.get(storagePath, yyyy, mm).toAbsolutePath();
        Files.createDirectories(dir);

        String safeOri = oriName.replaceAll("[\\\\/:*?\"<>|]", "_");
        String savedName = afileId + "_" + sn + "_" + safeOri;
        Path target = dir.resolve(savedName);
        mf.transferTo(target.toFile());

        // 이미지면 webp 변환 동반 생성
        String webpFileNm = null;
        String webpFilePath = null;
        if (IMAGE_EXTS.contains(ext)) {
            try {
                String webpName = afileId + "_" + sn + "_" + stripExtension(safeOri) + ".webp";
                Path webpTarget = dir.resolve(webpName);
                convertToWebp(target, webpTarget);
                webpFileNm = webpName;
                webpFilePath = webpTarget.toAbsolutePath().toString();
            } catch (Exception ignored) {
                // webp 변환 실패는 업로드를 막지 않음 — 원본만 보관
            }
        }

        Attachment saved = attachmentRepository.save(Attachment.builder()
                .afileId(afileId)
                .afileSn(sn)
                .filePath(target.toAbsolutePath().toString())
                .fileNm(savedName)
                .oriFileNm(oriName)
                .webpFileNm(webpFileNm)
                .webpFilePath(webpFilePath)
                .fileExt(ext)
                .fileSz(BigDecimal.valueOf(mf.getSize()))
                .repFileYn("N")
                .delYn("N")
                .build());

        return toMeta(saved);
    }

    /** BLOB 저장 — int_com_file에 메타 INSERT (FK 마스터) + int_com_file_blob에 BLOB 데이터 INSERT. */
    private FileMeta saveToBlob(String afileId, int sn, MultipartFile mf,
                                String oriName, String ext) throws IOException {
        byte[] bytes = mf.getBytes();
        String safeOri = oriName.replaceAll("[\\\\/:*?\"<>|]", "_");
        String savedName = afileId + "_" + sn + "_" + safeOri;
        String blobMarker = "blob:/" + savedName;

        Attachment savedMeta = attachmentRepository.save(Attachment.builder()
                .afileId(afileId)
                .afileSn(sn)
                .filePath(blobMarker)
                .fileNm(savedName)
                .oriFileNm(oriName)
                .fileExt(ext)
                .fileSz(BigDecimal.valueOf(mf.getSize()))
                .repFileYn("N")
                .delYn("N")
                .build());

        blobRepository.save(AttachmentBlob.builder()
                .afileId(afileId)
                .afileSn(sn)
                .fileBlob(bytes)
                .filePath(blobMarker)
                .fileNm(savedName)
                .oriFileNm(oriName)
                .fileSz(BigDecimal.valueOf(mf.getSize()))
                .delYn("N")
                .build());

        return FileMeta.builder()
                .afileId(savedMeta.getAfileId())
                .afileSn(savedMeta.getAfileSn())
                .fileNm(savedMeta.getFileNm())
                .oriFileNm(savedMeta.getOriFileNm())
                .fileExt(ext)
                .fileSize(savedMeta.getFileSz() != null ? savedMeta.getFileSz().longValue() : 0L)
                .storage("BLOB")
                .build();
    }

    private void convertToWebp(Path source, Path target) throws IOException {
        ImmutableImage image = ImmutableImage.loader().fromPath(source);
        image.output(WebpWriter.DEFAULT, target);
    }

    private String stripExtension(String name) {
        int idx = name.lastIndexOf('.');
        return idx > 0 ? name.substring(0, idx) : name;
    }

    private FileMeta toMeta(Attachment a) {
        boolean isBlob = a.getFilePath() != null && a.getFilePath().startsWith("blob:/");
        return FileMeta.builder()
                .afileId(a.getAfileId())
                .afileSn(a.getAfileSn())
                .fileNm(a.getFileNm())
                .oriFileNm(a.getOriFileNm())
                .fileExt(a.getFileExt())
                .fileSize(a.getFileSz() != null ? a.getFileSz().longValue() : 0L)
                .webpFileNm(a.getWebpFileNm())
                .storage(isBlob ? "BLOB" : "FS")
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class UploadResponse {
        private String afileId;
        private List<FileMeta> files;
    }

    @Getter
    @Builder
    public static class FileMeta {
        private String afileId;
        private Integer afileSn;
        private String fileNm;
        private String oriFileNm;
        private String fileExt;
        private Long fileSize;
        private String webpFileNm;
        /** "FS" (파일시스템) 또는 "BLOB" */
        private String storage;
    }

    @Getter
    @Builder
    public static class DownloadResult {
        private String fileName;
        private String contentType;
        private Resource resource;
        private long size;
    }
}
