package com.infomind.backend.domain.report;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/report-forms")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminReportService.FormDto>>> getForms() {
        return ResponseEntity.ok(ApiResponse.ok(service.getForms()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminReportService.FormDto>> createForm(@Valid @RequestBody AdminReportService.FormRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.createForm(req)));
    }

    @PutMapping("/{formId}")
    public ResponseEntity<ApiResponse<AdminReportService.FormDto>> updateForm(@PathVariable String formId,
                                                                              @Valid @RequestBody AdminReportService.FormRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateForm(formId, req)));
    }

    @PatchMapping("/{formId}/enable")
    public ResponseEntity<ApiResponse<AdminReportService.FormDto>> enableForm(@PathVariable String formId) {
        return ResponseEntity.ok(ApiResponse.ok(service.setFormEnabled(formId, true)));
    }

    @PatchMapping("/{formId}/disable")
    public ResponseEntity<ApiResponse<AdminReportService.FormDto>> disableForm(@PathVariable String formId) {
        return ResponseEntity.ok(ApiResponse.ok(service.setFormEnabled(formId, false)));
    }

    @GetMapping("/{formId}/rounds")
    public ResponseEntity<ApiResponse<List<AdminReportService.RoundDto>>> getRounds(@PathVariable String formId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRounds(formId)));
    }

    @PostMapping("/{formId}/rounds")
    public ResponseEntity<ApiResponse<AdminReportService.RoundDto>> createRound(@PathVariable String formId,
                                                                                @Valid @RequestBody AdminReportService.RoundRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.createRound(formId, req)));
    }

    @PutMapping("/{formId}/rounds/{roundSn}")
    public ResponseEntity<ApiResponse<AdminReportService.RoundDto>> updateRound(@PathVariable String formId,
                                                                                @PathVariable Long roundSn,
                                                                                @Valid @RequestBody AdminReportService.RoundRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateRound(formId, roundSn, req)));
    }

    @DeleteMapping("/{formId}/rounds/{roundSn}")
    public ResponseEntity<ApiResponse<Void>> deleteRound(@PathVariable String formId, @PathVariable Long roundSn) {
        service.deleteRound(formId, roundSn);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{formId}/rounds/{roundSn}/submissions")
    public ResponseEntity<ApiResponse<List<AdminReportService.SubmissionDto>>> getSubmissions(@PathVariable String formId,
                                                                                              @PathVariable Long roundSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSubmissions(formId, roundSn)));
    }

    @PostMapping("/{formId}/rounds/{roundSn}/summary")
    public ResponseEntity<ApiResponse<AdminReportService.RoundDto>> generateSummary(@PathVariable String formId,
                                                                                    @PathVariable Long roundSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.generateSummary(formId, roundSn)));
    }

    @PutMapping("/{formId}/rounds/{roundSn}/summary")
    public ResponseEntity<ApiResponse<AdminReportService.RoundDto>> updateSummary(@PathVariable String formId,
                                                                                  @PathVariable Long roundSn,
                                                                                  @Valid @RequestBody AdminReportService.SummaryRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateSummary(formId, roundSn, req)));
    }
}
