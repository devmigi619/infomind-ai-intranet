package com.infomind.backend.domain.report;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weekly-reports")
@RequiredArgsConstructor
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WeeklyReportService.WeeklyReportDto>>> getMyReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "weekStart"));
        return ResponseEntity.ok(ApiResponse.ok(weeklyReportService.getMyReports(userId, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WeeklyReportService.WeeklyReportDto>> getReport(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(weeklyReportService.getReport(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WeeklyReportService.WeeklyReportDto>> createReport(
            @Valid @RequestBody WeeklyReportService.CreateReportRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(weeklyReportService.createReport(userId, request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WeeklyReportService.WeeklyReportDto>> updateReport(
            @PathVariable Long id,
            @Valid @RequestBody WeeklyReportService.CreateReportRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(weeklyReportService.updateReport(id, userId, request)));
    }
}
