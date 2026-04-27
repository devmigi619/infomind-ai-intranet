package com.infomind.backend.domain.user;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserInfoResponse>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoResponse>> getMe(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(userService.getMe(userId)));
    }

    @PutMapping("/me/fcm-token")
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(
            Authentication authentication,
            @Valid @RequestBody FcmTokenRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        userService.updateFcmToken(userId, request.getFcmToken());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Getter
    public static class FcmTokenRequest {
        @NotBlank
        private String fcmToken;
    }

    @Getter
    @Builder
    public static class UserInfoResponse {
        private Long id;
        private String username;
        private String name;
        private String department;
        private String position;
        private String role;
    }
}
