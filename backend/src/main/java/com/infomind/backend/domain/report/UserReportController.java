package com.infomind.backend.domain.report;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class UserReportController {

    private final UserReportService service;

    @GetMapping("/my-rounds")
    public ResponseEntity<ApiResponse<List<UserReportService.MyReportRoundDto>>> getMyRounds(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyRounds(userId)));
    }

    @GetMapping("/{formId}/rounds/{roundSn}")
    public ResponseEntity<ApiResponse<UserReportService.MyReportRoundDto>> getMyRound(
            @AuthenticationPrincipal String userId,
            @PathVariable String formId,
            @PathVariable Long roundSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyRound(userId, formId, roundSn)));
    }

    @GetMapping("/{formId}/rounds/{roundSn}/submissions")
    public ResponseEntity<ApiResponse<List<UserReportService.SubmissionDto>>> getSubmissions(
            @AuthenticationPrincipal String userId,
            @PathVariable String formId,
            @PathVariable Long roundSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSubmissions(userId, formId, roundSn)));
    }

    @PutMapping("/{formId}/rounds/{roundSn}/draft")
    public ResponseEntity<ApiResponse<UserReportService.MyReportRoundDto>> saveDraft(
            @AuthenticationPrincipal String userId,
            @PathVariable String formId,
            @PathVariable Long roundSn,
            @Valid @RequestBody UserReportService.ReportWriteRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.saveDraft(userId, formId, roundSn, req)));
    }

    @PostMapping("/{formId}/rounds/{roundSn}/submit")
    public ResponseEntity<ApiResponse<UserReportService.MyReportRoundDto>> submit(
            @AuthenticationPrincipal String userId,
            @PathVariable String formId,
            @PathVariable Long roundSn,
            @Valid @RequestBody UserReportService.ReportWriteRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.submit(userId, formId, roundSn, req)));
    }
}
