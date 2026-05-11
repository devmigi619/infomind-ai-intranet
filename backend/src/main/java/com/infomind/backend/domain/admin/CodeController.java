package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 공통코드 조회 — 인증된 사용자 전체 접근 (ADMIN 불필요).
 * _SE 로 끝나는 컬럼의 콤보박스 옵션을 제공한다.
 *
 * GET /api/codes/{upCd}
 *   upCd: 컬럼명 대문자 (예: USER_SE, APRVL_SE)
 *   반환: USE_YN = 'Y' 인 하위코드 목록 (cdOrd 오름차순)
 */
@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
public class CodeController {

    private final CommonCodeService commonCodeService;

    @GetMapping("/{upCd}")
    public ResponseEntity<ApiResponse<List<CommonCodeService.CommonCodeDto>>> getActiveCodes(
            @PathVariable String upCd) {
        return ResponseEntity.ok(ApiResponse.ok(commonCodeService.getActiveCodes(upCd)));
    }
}
