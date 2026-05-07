package com.infomind.backend.domain.user;

import com.infomind.backend.common.ApiResponse;
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
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(userService.getMe(userId)));
    }

    @Getter
    @Builder
    public static class UserInfoResponse {
        private String userId;
        private String userNm;
        private String deptCd;
        private String jbgdCd;
        private String userSe;
        private String eml;
    }
}
