package com.infomind.backend.domain.user;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.login(request.getUserId(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponse>> refresh(@RequestBody RefreshRequest request) {
        RefreshResponse response = userService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshRequest request) {
        userService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Getter
    public static class LoginRequest {
        @NotBlank
        private String userId;
        @NotBlank
        private String password;
    }

    @Getter
    @Builder
    public static class LoginResponse {
        private String token;
        private String refreshToken;
        private UserController.UserInfoResponse user;
    }

    @Getter
    public static class RefreshRequest {
        private String refreshToken;
    }

    @Getter
    @Builder
    public static class RefreshResponse {
        private String token;
    }
}
