package com.infomind.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long expiryHours;
    private final long refreshExpiryDays;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiry-hours}") long expiryHours,
            @Value("${jwt.refresh-expiry-days}") long refreshExpiryDays) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryHours = expiryHours;
        this.refreshExpiryDays = refreshExpiryDays;
    }

    public long getRefreshExpiryDays() {
        return refreshExpiryDays;
    }

    public String generateToken(String userId, String userSe) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiryHours * 3600 * 1000);
        return Jwts.builder()
                .subject(userId)
                .claim("userSe", userSe)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshExpiryDays * 24L * 3600 * 1000);
        return Jwts.builder()
                .subject(userId)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** JWT subject = userId (String) */
    public String getUserId(String token) {
        return getClaims(token).getSubject();
    }

    /** 토큰 만료 시각 반환 (리프레시 토큰 DB 저장 시 사용) */
    public Date getExpiration(String token) {
        return getClaims(token).getExpiration();
    }
}
