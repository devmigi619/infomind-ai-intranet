package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/common-codes")
@RequiredArgsConstructor
public class CommonCodeController {

    private final CommonCodeService commonCodeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommonCodeService.CommonCodeDto>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.ok(commonCodeService.getCategories()));
    }

    @GetMapping("/{upCd}")
    public ResponseEntity<ApiResponse<List<CommonCodeService.CommonCodeDto>>> getCodes(
            @PathVariable String upCd) {
        return ResponseEntity.ok(ApiResponse.ok(commonCodeService.getCodes(upCd)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommonCodeService.CommonCodeDto>> createCode(
            @Valid @RequestBody CommonCodeService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(commonCodeService.createCode(request)));
    }

    @PutMapping("/{upCd}/{cd}")
    public ResponseEntity<ApiResponse<CommonCodeService.CommonCodeDto>> updateCode(
            @PathVariable String upCd,
            @PathVariable String cd,
            @Valid @RequestBody CommonCodeService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(commonCodeService.updateCode(upCd, cd, request)));
    }

    @DeleteMapping("/{upCd}/{cd}")
    public ResponseEntity<ApiResponse<Void>> deleteCode(
            @PathVariable String upCd,
            @PathVariable String cd) {
        commonCodeService.deleteCode(upCd, cd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
