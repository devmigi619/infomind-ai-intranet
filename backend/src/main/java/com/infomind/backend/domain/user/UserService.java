package com.infomind.backend.domain.user;

import com.infomind.backend.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional(readOnly = true)
    public AuthController.LoginResponse login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }
        String token = jwtProvider.generateToken(user.getId(), user.getUsername(), user.getRole().name());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId());
        return AuthController.LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .user(toUserInfo(user))
                .build();
    }

    @Transactional(readOnly = true)
    public UserController.UserInfoResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        return toUserInfo(user);
    }

    @Transactional(readOnly = true)
    public List<UserController.UserInfoResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserInfo)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AuthController.RefreshResponse refresh(String refreshToken) {
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 refresh token입니다.");
        }
        Long userId = jwtProvider.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        String newToken = jwtProvider.generateToken(user.getId(), user.getUsername(), user.getRole().name());
        return AuthController.RefreshResponse.builder().token(newToken).build();
    }

    @Transactional
    public void updateFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        user.updateFcmToken(fcmToken);
    }

    private UserController.UserInfoResponse toUserInfo(User user) {
        return UserController.UserInfoResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .department(user.getDepartment())
                .position(user.getPosition())
                .role(user.getRole().name())
                .build();
    }
}
