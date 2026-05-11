package com.infomind.backend.domain.user;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** 목록 조회 (keyword: 이름/아이디, status: ALL|ACTIVE|INACTIVE) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserService.UserSummaryDto>>> getUserList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(ApiResponse.ok(adminUserService.getUserList(keyword, status)));
    }

    /** 사용자 생성 */
    @PostMapping
    public ResponseEntity<ApiResponse<AdminUserService.UserSummaryDto>> createUser(
            @Valid @RequestBody AdminUserService.CreateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(adminUserService.createUser(request)));
    }

    /** 사용자 정보 수정 */
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<AdminUserService.UserSummaryDto>> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody AdminUserService.UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(adminUserService.updateUser(userId, request)));
    }

    /** 비밀번호 초기화 */
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable String userId,
            @Valid @RequestBody AdminUserService.ResetPasswordRequest request) {
        adminUserService.resetPassword(userId, request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 계정 비활성화 (user_se = INVALID) */
    @PatchMapping("/{userId}/disable")
    public ResponseEntity<ApiResponse<Void>> disableUser(@PathVariable String userId) {
        adminUserService.disableUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 계정 활성화 (user_se = USER) */
    @PatchMapping("/{userId}/enable")
    public ResponseEntity<ApiResponse<Void>> enableUser(@PathVariable String userId) {
        adminUserService.enableUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
