package com.infomind.backend.common.attachment;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 첨부파일 REST API.
 *
 * <pre>
 * POST   /api/files/upload          multipart, 인증 필요. body: files[], afileId?, prefix
 * GET    /api/files/{afileId}        그룹의 활성 파일 목록 (메타만)
 * GET    /api/files/{afileId}/{sn}   다운로드 (권한 체크)
 * DELETE /api/files/{afileId}/{sn}   soft delete (권한 체크)
 * </pre>
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<AttachmentService.UploadResponse>> upload(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "afileId", required = false) String afileId,
            @RequestParam(value = "prefix", required = false) String prefix,
            @RequestParam(value = "embedEnabled", defaultValue = "true") boolean embedEnabled) {
        return ResponseEntity.ok(ApiResponse.ok(attachmentService.upload(files, afileId, prefix, embedEnabled)));
    }

    @GetMapping("/{afileId}")
    public ResponseEntity<ApiResponse<List<AttachmentService.FileMeta>>> getFiles(
            @PathVariable String afileId) {
        String userId = currentUserId();
        return ResponseEntity.ok(ApiResponse.ok(attachmentService.getFiles(afileId, userId)));
    }

    @GetMapping("/{afileId}/{sn}")
    public ResponseEntity<Resource> download(
            @PathVariable String afileId,
            @PathVariable("sn") Integer afileSn) {
        String userId = currentUserId();
        AttachmentService.DownloadResult r = attachmentService.download(afileId, afileSn, userId);

        String encoded = URLEncoder.encode(r.getFileName() != null ? r.getFileName() : "file",
                StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encoded)
                .contentType(MediaType.parseMediaType(
                        r.getContentType() != null ? r.getContentType() : "application/octet-stream"))
                .contentLength(r.getSize())
                .body(r.getResource());
    }

    @DeleteMapping("/{afileId}/{sn}")
    public ResponseEntity<ApiResponse<Void>> softDelete(
            @PathVariable String afileId,
            @PathVariable("sn") Integer afileSn) {
        String userId = currentUserId();
        attachmentService.softDelete(afileId, afileSn, userId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private String currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return principal instanceof String ? (String) principal : null;
    }
}
