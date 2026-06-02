package com.infomind.backend.domain.aprvform;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/aprv-forms")
@RequiredArgsConstructor
public class AprvFormController {

    private final AprvFormService aprvFormService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AprvFormService.SummaryDto>>> getList() {
        return ResponseEntity.ok(ApiResponse.ok(aprvFormService.getList()));
    }

    @GetMapping("/{aprvFormId}")
    public ResponseEntity<ApiResponse<AprvFormService.DetailDto>> getDetail(
            @PathVariable String aprvFormId) {
        return ResponseEntity.ok(ApiResponse.ok(aprvFormService.getDetail(aprvFormId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AprvFormService.DetailDto>> create(
            @Valid @RequestBody AprvFormService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(aprvFormService.create(request)));
    }

    @PutMapping("/{aprvFormId}")
    public ResponseEntity<ApiResponse<AprvFormService.DetailDto>> update(
            @PathVariable String aprvFormId,
            @Valid @RequestBody AprvFormService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(aprvFormService.update(aprvFormId, request)));
    }

    @DeleteMapping("/{aprvFormId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String aprvFormId) {
        aprvFormService.delete(aprvFormId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
