package cn.novelstudio.platform.web.utils;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 客户端 IP 解析（支持代理头）。
 */
public final class IpUtils {

    private IpUtils() {}

    public static String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String ip = firstHeader(request, "X-Forwarded-For");
        if (ip != null) {
            int index = ip.indexOf(',');
            return index == -1 ? ip.trim() : ip.substring(0, index).trim();
        }
        ip = firstHeader(request, "X-Real-IP");
        if (ip != null) {
            return normalizeLoopback(ip);
        }
        return normalizeLoopback(request.getRemoteAddr());
    }

    private static String firstHeader(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value == null || value.isEmpty() || "unknown".equalsIgnoreCase(value)) {
            return null;
        }
        return value;
    }

    private static String normalizeLoopback(String ip) {
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip;
    }
}
