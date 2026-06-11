package cn.novelstudio.module.auth.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientRequestSupport {

    public String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }

    public String fingerprint(HttpServletRequest request) {
        String fp = request.getHeader("X-Fingerprint");
        return fp == null || fp.isBlank() ? null : fp.trim();
    }
}
