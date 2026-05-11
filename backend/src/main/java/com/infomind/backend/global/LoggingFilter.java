package com.infomind.backend.global;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
public class LoggingFilter extends OncePerRequestFilter {

    private static final AntPathMatcher matcher = new AntPathMatcher();

    /** 로그를 남기지 않을 경로 */
    private static final List<String> SKIP_PATHS = List.of(
            "/actuator/health"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return SKIP_PATHS.stream().anyMatch(p -> matcher.match(p, uri));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long start = System.currentTimeMillis();

        try {
            chain.doFilter(request, response);
        } finally {
            long elapsed = System.currentTimeMillis() - start;

            String userId = resolveUserId();
            int status = response.getStatus();
            String level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";

            String message = "[{}] {} {} | status={} | {}ms | user={}";
            Object[] args = {
                    getClientIp(request),
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    elapsed,
                    userId
            };

            switch (level) {
                case "ERROR" -> log.error(message, args);
                case "WARN"  -> log.warn(message, args);
                default      -> log.info(message, args);
            }
        }
    }

    /** SecurityContext에서 인증된 userId 추출 */
    private String resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return String.valueOf(auth.getPrincipal());
        }
        return "anonymous";
    }

    /** X-Forwarded-For 헤더 우선, 없으면 RemoteAddr */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
