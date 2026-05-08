package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/job-grades")
@RequiredArgsConstructor
public class JobGradeController {

    private final JobGradeService jobGradeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<JobGradeService.JobGradeDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(jobGradeService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JobGradeService.JobGradeDto>> create(
            @Valid @RequestBody JobGradeService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(jobGradeService.create(request)));
    }

    @PutMapping("/{jbgdCd}")
    public ResponseEntity<ApiResponse<JobGradeService.JobGradeDto>> update(
            @PathVariable String jbgdCd,
            @Valid @RequestBody JobGradeService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(jobGradeService.update(jbgdCd, request)));
    }

    @DeleteMapping("/{jbgdCd}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String jbgdCd) {
        jobGradeService.delete(jbgdCd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
