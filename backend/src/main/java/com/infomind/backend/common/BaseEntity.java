package com.infomind.backend.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;

@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "CRT_AT", updatable = false)
    private LocalDate crtAt;

    @Column(name = "CRT_BY", length = 100, updatable = false)
    private String crtBy;

    @Column(name = "CRT_IP", length = 40, updatable = false)
    private String crtIp;

    @Column(name = "UPD_AT")
    private LocalDate updAt;

    @Column(name = "UPD_BY", length = 100)
    private String updBy;

    @Column(name = "UPD_IP", length = 40)
    private String updIp;

    @PrePersist
    protected void onCreate() {
        LocalDate today = LocalDate.now();
        String userId = resolveCurrentUserId();
        String ip = resolveCurrentIp();
        this.crtAt = today;
        this.crtBy = userId;
        this.crtIp = ip;
        this.updAt = today;
        this.updBy = userId;
        this.updIp = ip;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updAt = LocalDate.now();
        this.updBy = resolveCurrentUserId();
        this.updIp = resolveCurrentIp();
    }

    private String resolveCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof String) {
                return (String) auth.getPrincipal();
            }
        } catch (Exception ignored) {}
        return "system";
    }

    private String resolveCurrentIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                String ip = attrs.getRequest().getHeader("X-Forwarded-For");
                if (ip == null || ip.isBlank()) {
                    ip = attrs.getRequest().getRemoteAddr();
                }
                return ip;
            }
        } catch (Exception ignored) {}
        return "0.0.0.0";
    }
}
