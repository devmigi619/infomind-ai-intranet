package com.infomind.backend.domain.aprvform;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 일반 사용자용 양식 조회 (admin 권한 불필요) */
@RestController
@RequestMapping("/api/aprv-forms")
@RequiredArgsConstructor
public class AprvFormPublicController {

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
}
