package com.infomind.backend.domain.leave;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class LeaveReqController {

    private final LeaveReqService service;

    // ─── 잔여 휴가 ─────────────────────────────────────────────────────────────

    @GetMapping("/api/leave-req/my-leave-balance")
    public ResponseEntity<ApiResponse<LeaveReqService.MyLeaveBalanceDto>> getMyLeaveBalance(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyLeaveBalance(userId)));
    }

    // ─── 목록 ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/leave-req?role=my      → 내 신청 목록
     * GET /api/leave-req?role=approver → 결재 대기 목록
     */
    @GetMapping("/api/leave-req")
    public ResponseEntity<ApiResponse<List<LeaveReqService.LeaveReqSummaryDto>>> getList(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "my") String role) {
        List<LeaveReqService.LeaveReqSummaryDto> list =
                "approver".equals(role)
                        ? service.getPendingForApprover(userId)
                        : service.getMyList(userId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    // ─── 상세 ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/leave-req/{reqUserId}/{reqSn}")
    public ResponseEntity<ApiResponse<LeaveReqService.LeaveReqDetailDto>> getDetail(
            @PathVariable String reqUserId,
            @PathVariable Long reqSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDetail(reqUserId, reqSn)));
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────────

    @PostMapping("/api/leave-req")
    public ResponseEntity<ApiResponse<LeaveReqService.LeaveReqDetailDto>> create(
            @AuthenticationPrincipal String userId,
            @RequestBody LeaveReqService.LeaveReqCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.create(userId, req)));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────────

    @PutMapping("/api/leave-req/{reqUserId}/{reqSn}")
    public ResponseEntity<ApiResponse<LeaveReqService.LeaveReqDetailDto>> update(
            @AuthenticationPrincipal String userId,
            @PathVariable String reqUserId,
            @PathVariable Long reqSn,
            @RequestBody LeaveReqService.LeaveReqCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(reqUserId, reqSn, userId, req)));
    }

    // ─── 취소 ──────────────────────────────────────────────────────────────────

    @DeleteMapping("/api/leave-req/{reqUserId}/{reqSn}")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @AuthenticationPrincipal String userId,
            @PathVariable String reqUserId,
            @PathVariable Long reqSn) {
        service.cancel(reqUserId, reqSn, userId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── 승인 ──────────────────────────────────────────────────────────────────

    @PostMapping("/api/leave-req/{reqUserId}/{reqSn}/approve")
    public ResponseEntity<ApiResponse<LeaveReqService.LeaveReqDetailDto>> approve(
            @AuthenticationPrincipal String userId,
            @PathVariable String reqUserId,
            @PathVariable Long reqSn) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(reqUserId, reqSn, userId)));
    }

    // ─── 반려 ──────────────────────────────────────────────────────────────────

    @PostMapping("/api/leave-req/{reqUserId}/{reqSn}/reject")
    public ResponseEntity<ApiResponse<LeaveReqService.LeaveReqDetailDto>> reject(
            @AuthenticationPrincipal String userId,
            @PathVariable String reqUserId,
            @PathVariable Long reqSn,
            @RequestBody LeaveReqService.RejectRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.reject(reqUserId, reqSn, userId, req.getRmk())));
    }
}
