package com.infomind.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Spring → FastAPI 호출용 시스템 사용자 JWT 발급.
 *
 * <p>{@link com.infomind.backend.security.JwtProvider}와 동일한 {@code jwt.secret} +
 * HS256 알고리즘을 사용하지만, 보안 영역 침범을 피하기 위해 별도 클래스로 분리.
 * subject={@code "system"}, userSe={@code "SYSTEM"}, 만료 5분.</p>
 */
@Component
public class SystemJwtIssuer {

    private static final long EXPIRY_MILLIS = 5L * 60 * 1000; // 5분

    private final SecretKey secretKey;

    public SystemJwtIssuer(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issueSystemToken() {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRY_MILLIS);
        return Jwts.builder()
                .subject("system")
                .claim("userSe", "SYSTEM")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }
}
