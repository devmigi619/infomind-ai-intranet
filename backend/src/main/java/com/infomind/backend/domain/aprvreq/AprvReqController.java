package com.infomind.backend.domain.aprvreq;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class AprvReqController {

    private final AprvReqService aprvReqService;

    /** 내 결재함 */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<AprvReqService.SummaryDto>>> getMine(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(aprvReqService.getMine(auth.getName())));
    }

    /** 결재 대기함 */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<AprvReqService.SummaryDto>>> getPending(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(aprvReqService.getPending(auth.getName())));
    }

    /** 상세 조회 */
    @GetMapping("/{aprvFormId}/{reqUserId}/{aprvReqSn}")
    public ResponseEntity<ApiResponse<AprvReqService.DetailDto>> getDetail(
            @PathVariable String aprvFormId,
            @PathVariable String reqUserId,
            @PathVariable Long aprvReqSn) {
        return ResponseEntity.ok(ApiResponse.ok(aprvReqService.getDetail(aprvFormId, reqUserId, aprvReqSn)));
    }

    /** 결재 신청 */
    @PostMapping
    public ResponseEntity<ApiResponse<AprvReqService.DetailDto>> create(
            Authentication auth,
            @Valid @RequestBody AprvReqService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(aprvReqService.create(auth.getName(), request)));
    }

    /** 승인 */
    @PostMapping("/{aprvFormId}/{reqUserId}/{aprvReqSn}/approve")
    public ResponseEntity<ApiResponse<AprvReqService.DetailDto>> approve(
            @PathVariable String aprvFormId,
            @PathVariable String reqUserId,
            @PathVariable Long aprvReqSn,
            Authentication auth,
            @RequestBody(required = false) AprvReqService.ApproveRequest request) {
        String rmk = request != null ? request.getRmk() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                aprvReqService.approve(aprvFormId, reqUserId, aprvReqSn, auth.getName(), rmk)));
    }

    /** 반려 */
    @PostMapping("/{aprvFormId}/{reqUserId}/{aprvReqSn}/reject")
    public ResponseEntity<ApiResponse<AprvReqService.DetailDto>> reject(
            @PathVariable String aprvFormId,
            @PathVariable String reqUserId,
            @PathVariable Long aprvReqSn,
            Authentication auth,
            @RequestBody(required = false) AprvReqService.ApproveRequest request) {
        String rmk = request != null ? request.getRmk() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                aprvReqService.reject(aprvFormId, reqUserId, aprvReqSn, auth.getName(), rmk)));
    }

    /** 신청 취소 */
    @PostMapping("/{aprvFormId}/{reqUserId}/{aprvReqSn}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable String aprvFormId,
            @PathVariable String reqUserId,
            @PathVariable Long aprvReqSn,
            Authentication auth) {
        aprvReqService.cancel(aprvFormId, reqUserId, aprvReqSn, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
