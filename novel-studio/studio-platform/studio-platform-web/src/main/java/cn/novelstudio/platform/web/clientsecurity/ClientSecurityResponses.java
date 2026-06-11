package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

final class ClientSecurityResponses {

    private ClientSecurityResponses() {
    }

    static void badRequest(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        response.setContentType("application/json;charset=UTF-8");
        String safe = message == null ? "bad request" : message.replace("\"", "'");
        response.getOutputStream().write(("{\"code\":400,\"message\":\"" + safe + "\"}").getBytes(StandardCharsets.UTF_8));
    }

    static void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        String safe = message == null ? "登录已过期，请重新登录" : message.replace("\"", "'");
        response.getOutputStream().write(("{\"code\":401,\"message\":\"" + safe + "\"}").getBytes(StandardCharsets.UTF_8));
    }

    static void forbidden(HttpServletResponse response, String code) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getOutputStream().write(("{\"code\":403,\"message\":\"" + code + "\"}").getBytes(StandardCharsets.UTF_8));
    }

    static void staleCrypto(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("X-Crypto-Stale", "1");
        String safe = message == null ? "crypto stale" : message.replace("\"", "'");
        response.getOutputStream().write(
            ("{\"code\":404,\"message\":\"" + safe + "\",\"cryptoStale\":true}").getBytes(StandardCharsets.UTF_8)
        );
    }
}
