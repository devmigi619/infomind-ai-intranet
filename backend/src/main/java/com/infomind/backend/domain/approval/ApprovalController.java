package com.infomind.backend.domain.approval;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getApprovals(
            @RequestParam(defaultValue = "my") String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if ("pending".equalsIgnoreCase(type)) {
            List<ApprovalService.ApprovalSummaryDto> result = approvalService.getPendingForMe(userId);
            return ResponseEntity.ok(ApiResponse.ok(result));
        } else {
            PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<ApprovalService.ApprovalSummaryDto> result = approvalService.getMyApprovals(userId, pageable);
            return ResponseEntity.ok(ApiResponse.ok(result));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApprovalService.ApprovalDetailDto>> getApproval(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(approvalService.getApprovalDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ApprovalService.ApprovalDetailDto>> createApproval(
            @Valid @RequestBody ApprovalService.CreateApprovalRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(approvalService.createApproval(userId, request)));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<ApprovalService.ApprovalDetailDto>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalService.ApproveRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(ApiResponse.ok(approvalService.approve(id, userId, comment)));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<ApprovalService.ApprovalDetailDto>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalService.ApproveRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(ApiResponse.ok(approvalService.reject(id, userId, comment)));
    }
}
