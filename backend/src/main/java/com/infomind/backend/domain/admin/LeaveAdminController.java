package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class LeaveAdminController {

    private final LeaveAdminService service;

    // ─── MST ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/leave-mst")
    public ResponseEntity<ApiResponse<List<LeaveAdminService.MstDto>>> getAllMst() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllMst()));
    }

    @PostMapping("/api/admin/leave-mst")
    public ResponseEntity<ApiResponse<LeaveAdminService.MstDto>> createMst(
            @Valid @RequestBody LeaveAdminService.MstCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.createMst(req)));
    }

    @PutMapping("/api/admin/leave-mst/{leaveCd}")
    public ResponseEntity<ApiResponse<LeaveAdminService.MstDto>> updateMst(
            @PathVariable String leaveCd,
            @Valid @RequestBody LeaveAdminService.MstUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateMst(leaveCd, req)));
    }

    @DeleteMapping("/api/admin/leave-mst/{leaveCd}")
    public ResponseEntity<ApiResponse<Void>> deleteMst(@PathVariable String leaveCd) {
        service.deleteMst(leaveCd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── DTL ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/leave-dtl")
    public ResponseEntity<ApiResponse<List<LeaveAdminService.DtlDto>>> getDtl(
            @RequestParam String leaveCd) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDtlByLeaveCd(leaveCd)));
    }

    @PostMapping("/api/admin/leave-dtl")
    public ResponseEntity<ApiResponse<LeaveAdminService.DtlDto>> createDtl(
            @Valid @RequestBody LeaveAdminService.DtlCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.createDtl(req)));
    }

    @PutMapping("/api/admin/leave-dtl/{leaveCd}/{leaveDtlCd}")
    public ResponseEntity<ApiResponse<LeaveAdminService.DtlDto>> updateDtl(
            @PathVariable String leaveCd,
            @PathVariable String leaveDtlCd,
            @Valid @RequestBody LeaveAdminService.DtlUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateDtl(leaveCd, leaveDtlCd, req)));
    }

    @DeleteMapping("/api/admin/leave-dtl/{leaveCd}/{leaveDtlCd}")
    public ResponseEntity<ApiResponse<Void>> deleteDtl(
            @PathVariable String leaveCd,
            @PathVariable String leaveDtlCd) {
        service.deleteDtl(leaveCd, leaveDtlCd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── POL ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/leave-pol")
    public ResponseEntity<ApiResponse<List<LeaveAdminService.PolDto>>> getAllPol() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPol()));
    }

    @PostMapping("/api/admin/leave-pol")
    public ResponseEntity<ApiResponse<LeaveAdminService.PolDto>> createPol(
            @Valid @RequestBody LeaveAdminService.PolCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.createPol(req)));
    }

    @PutMapping("/api/admin/leave-pol/{leavePolCd}")
    public ResponseEntity<ApiResponse<LeaveAdminService.PolDto>> updatePol(
            @PathVariable String leavePolCd,
            @Valid @RequestBody LeaveAdminService.PolUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(service.updatePol(leavePolCd, req)));
    }

    @DeleteMapping("/api/admin/leave-pol/{leavePolCd}")
    public ResponseEntity<ApiResponse<Void>> deletePol(@PathVariable String leavePolCd) {
        service.deletePol(leavePolCd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
