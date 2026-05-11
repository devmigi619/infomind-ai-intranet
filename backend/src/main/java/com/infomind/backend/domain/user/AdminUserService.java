package com.infomind.backend.domain.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // ─── 목록 조회 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserSummaryDto> getUserList(String keyword, String status) {
        List<User> users;

        // 키워드 검색
        if (keyword != null && !keyword.isBlank()) {
            users = userRepository.findByUserIdContainingIgnoreCaseOrUserNmContainingIgnoreCase(
                    keyword, keyword);
        } else {
            users = userRepository.findAll();
        }

        // 상태 필터
        users = switch (status == null ? "ALL" : status.toUpperCase()) {
            case "ACTIVE"   -> users.stream()
                    .filter(u -> !"INVALID".equals(u.getUserSe()))
                    .collect(Collectors.toList());
            case "INACTIVE" -> users.stream()
                    .filter(u -> "INVALID".equals(u.getUserSe()))
                    .collect(Collectors.toList());
            default         -> users; // ALL
        };

        return users.stream().map(this::toDto).collect(Collectors.toList());
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    @Transactional
    public UserSummaryDto createUser(CreateUserRequest req) {
        if (userRepository.existsById(req.getUserId())) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다: " + req.getUserId());
        }
        User user = User.builder()
                .userId(req.getUserId())
                .userNm(req.getUserNm())
                .pwd(passwordEncoder.encode(req.getPwd()))
                .userSe(req.getUserSe() != null && !req.getUserSe().isBlank() ? req.getUserSe() : "USER")
                .deptCd(req.getDeptCd())
                .jbgdCd(req.getJbgdCd())
                .eml(req.getEml())
                .mtelno(req.getMtelno())
                .hireYmd(req.getHireYmd())
                .build();
        return toDto(userRepository.save(user));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public UserSummaryDto updateUser(String userId, UpdateUserRequest req) {
        User user = findUser(userId);
        user.update(req.getUserNm(), req.getUserSe(), req.getDeptCd(),
                req.getJbgdCd(), req.getEml(), req.getMtelno(), req.getHireYmd());
        return toDto(user);
    }

    // ─── 비밀번호 초기화 ──────────────────────────────────────────────────

    @Transactional
    public void resetPassword(String userId, ResetPasswordRequest req) {
        User user = findUser(userId);
        user.resetPassword(passwordEncoder.encode(req.getNewPassword()));
    }

    // ─── 비활성화 / 활성화 ───────────────────────────────────────────────

    @Transactional
    public void disableUser(String userId) {
        User user = findUser(userId);
        user.disable();
    }

    @Transactional
    public void enableUser(String userId) {
        User user = findUser(userId);
        user.enable();
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다: " + userId));
    }

    private UserSummaryDto toDto(User u) {
        return UserSummaryDto.builder()
                .userId(u.getUserId())
                .userNm(u.getUserNm())
                .userSe(u.getUserSe())
                .deptCd(u.getDeptCd())
                .jbgdCd(u.getJbgdCd())
                .eml(u.getEml())
                .mtelno(u.getMtelno())
                .hireYmd(u.getHireYmd())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class UserSummaryDto {
        private String userId;
        private String userNm;
        private String userSe;
        private String deptCd;
        private String jbgdCd;
        private String eml;
        private String mtelno;
        private String hireYmd;
    }

    @Getter
    public static class CreateUserRequest {
        @NotBlank private String userId;
        @NotBlank private String userNm;
        @NotBlank private String pwd;
        private String userSe;
        private String deptCd;
        private String jbgdCd;
        private String eml;
        private String mtelno;
        private String hireYmd;
    }

    @Getter
    public static class UpdateUserRequest {
        @NotBlank private String userNm;
        private String userSe;
        private String deptCd;
        private String jbgdCd;
        private String eml;
        private String mtelno;
        private String hireYmd;
    }

    @Getter
    public static class ResetPasswordRequest {
        @NotBlank private String newPassword;
    }
}
