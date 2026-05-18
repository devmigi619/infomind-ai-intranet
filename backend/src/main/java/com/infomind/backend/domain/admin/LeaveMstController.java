package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 인증된 모든 사용자가 접근 가능한 휴가 유형 READ 전용 엔드포인트.
 * 관리자 전용 /api/admin/leave-mst 와 달리 ADMIN 권한 불필요.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LeaveMstController {

    private final LeaveAdminService leaveAdminService;

    /**
     * 휴가 유형(MST) 전체 목록
     * GET /api/leave-mst
     */
    @GetMapping("/leave-mst")
    public ResponseEntity<ApiResponse<List<LeaveAdminService.MstDto>>> getMstList() {
        return ResponseEntity.ok(ApiResponse.ok(leaveAdminService.getAllMst()));
    }

    /**
     * 특정 휴가 유형의 세부 코드(DTL) 목록
     * GET /api/leave-dtl?leaveCd=xxx
     */
    @GetMapping("/leave-dtl")
    public ResponseEntity<ApiResponse<List<LeaveAdminService.DtlDto>>> getDtlList(
            @RequestParam String leaveCd) {
        return ResponseEntity.ok(ApiResponse.ok(leaveAdminService.getDtlByLeaveCd(leaveCd)));
    }
}
