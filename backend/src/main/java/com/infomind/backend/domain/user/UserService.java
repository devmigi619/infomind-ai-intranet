package com.infomind.backend.domain.user;

import com.infomind.backend.security.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional
    public AuthController.LoginResponse login(String userId, String rawPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        if (!passwordEncoder.matches(rawPassword, user.getPwd())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }

        String accessToken = jwtProvider.generateToken(user.getUserId(), user.getUserSe());
        String refreshTokenStr = jwtProvider.generateRefreshToken(user.getUserId());

        // 리프레시 토큰 DB 저장 (JWT 만료와 동일한 기간)
        RefreshToken refreshToken = RefreshToken.builder()
                .tkId(UUID.randomUUID().toString())
                .userId(user.getUserId())
                .tk(refreshTokenStr)
                .tkExpDt(LocalDate.now().plusDays(jwtProvider.getRefreshExpiryDays()))
                .rvkYn("N")
                .ipAddr(resolveIp())
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthController.LoginResponse.builder()
                .token(accessToken)
                .refreshToken(refreshTokenStr)
                .user(toUserInfo(user))
                .build();
    }

    @Transactional
    public AuthController.RefreshResponse refresh(String refreshTokenStr) {
        // 1. JWT 서명 검증
        if (!jwtProvider.validateToken(refreshTokenStr)) {
            throw new IllegalArgumentException("유효하지 않은 refresh token입니다.");
        }

        // 2. DB에서 미회수(RVK_YN=N) 토큰 확인
        RefreshToken stored = refreshTokenRepository.findByTkAndRvkYn(refreshTokenStr, "N")
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 refresh token입니다."));

        // 3. DB 만료일 검증
        if (stored.getTkExpDt().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("만료된 refresh token입니다.");
        }

        String userId = jwtProvider.getUserId(refreshTokenStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 4. 새 access token + 새 refresh token 발급 (Rolling Refresh)
        String newAccessToken = jwtProvider.generateToken(user.getUserId(), user.getUserSe());
        String newRefreshToken = jwtProvider.generateRefreshToken(user.getUserId());

        // 5. 기존 refresh token revoke
        stored.revoke();

        // 6. 새 refresh token DB 저장 (만료일도 미래로 갱신)
        RefreshToken newRecord = RefreshToken.builder()
                .tkId(UUID.randomUUID().toString())
                .userId(user.getUserId())
                .tk(newRefreshToken)
                .tkExpDt(LocalDate.now().plusDays(jwtProvider.getRefreshExpiryDays()))
                .rvkYn("N")
                .ipAddr(resolveIp())
                .build();
        refreshTokenRepository.save(newRecord);

        return AuthController.RefreshResponse.builder()
                .token(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.findByTkAndRvkYn(refreshTokenStr, "N")
                .ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public UserController.UserInfoResponse getMe(String userId) {
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

    private UserController.UserInfoResponse toUserInfo(User user) {
        return UserController.UserInfoResponse.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .deptCd(user.getDeptCd())
                .jbgdCd(user.getJbgdCd())
                .userSe(user.getUserSe())
                .eml(user.getEml())
                .build();
    }

    private String resolveIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String ip = req.getHeader("X-Forwarded-For");
                return (ip == null || ip.isBlank()) ? req.getRemoteAddr() : ip;
            }
        } catch (Exception ignored) {}
        return "0.0.0.0";
    }
}
