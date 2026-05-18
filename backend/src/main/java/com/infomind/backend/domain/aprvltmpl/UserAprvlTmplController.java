package com.infomind.backend.domain.aprvltmpl;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class UserAprvlTmplController {

    private final UserAprvlTmplService service;

    @GetMapping("/api/user-aprvl-tmpl")
    public ResponseEntity<ApiResponse<List<UserAprvlTmplService.TmplDetailDto>>> getMyTemplates(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyTemplates(userId)));
    }

    @PostMapping("/api/user-aprvl-tmpl")
    public ResponseEntity<ApiResponse<UserAprvlTmplService.TmplDetailDto>> create(
            @AuthenticationPrincipal String userId,
            @RequestBody UserAprvlTmplService.TmplCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.create(userId, req)));
    }

    @PutMapping("/api/user-aprvl-tmpl/{aprvlId}")
    public ResponseEntity<ApiResponse<UserAprvlTmplService.TmplDetailDto>> update(
            @AuthenticationPrincipal String userId,
            @PathVariable String aprvlId,
            @RequestBody UserAprvlTmplService.TmplCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(userId, aprvlId, req)));
    }

    @DeleteMapping("/api/user-aprvl-tmpl/{aprvlId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal String userId,
            @PathVariable String aprvlId) {
        service.delete(userId, aprvlId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
