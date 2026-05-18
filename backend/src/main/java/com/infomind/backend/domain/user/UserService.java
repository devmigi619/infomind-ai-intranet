package com.infomind.backend.domain.user;

import com.infomind.backend.global.InvalidRefreshTokenException;
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
        if ("INVALID".equals(user.getUserSe())) {
            throw new IllegalArgumentException("비활성화된 계정입니다. 관리자에게 문의하세요.");
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
        // 1~3: 서명·DB 보유 여부·만료일 통합 검증
        RefreshToken stored = validateAndGetRefreshToken(refreshTokenStr);

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

    /**
     * JWT 서명 검증 → DB 미회수 토큰 조회 → 만료일 검증을 한 번에 처리.
     * 세 케이스 모두 InvalidRefreshTokenException(419)으로 통일한다.
     */
    private RefreshToken validateAndGetRefreshToken(String tokenStr) {
        if (!jwtProvider.validateToken(tokenStr))
            throw new InvalidRefreshTokenException("인증이 올바르지 않습니다.");
        RefreshToken rtk = refreshTokenRepository.findByTkAndRvkYn(tokenStr, "N")
                .orElseThrow(() -> new InvalidRefreshTokenException("인증이 올바르지 않습니다."));
        if (rtk.getTkExpDt().isBefore(LocalDate.now()))
            throw new InvalidRefreshTokenException("인증이 올바르지 않습니다.");
        return rtk;
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
