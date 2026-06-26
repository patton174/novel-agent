package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.i18n.StudioMessages;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class ClientSecurityResponses {

    private static final Map<String, String> PROTOCOL_MESSAGE_KEYS = Map.of(
        "CSRF_INVALID", "security.client.csrf_invalid",
        "DEVICE_MISMATCH", "security.client.device_mismatch",
        "HEARTBEAT_REQUIRED", "security.client.heartbeat_required",
        "REPLAY_WINDOW", "security.client.replay_window",
        "REPLAY_NONCE", "security.client.replay_nonce"
    );

    private final StudioMessages messages;
    private final ResultLocalizer resultLocalizer;

    public ClientSecurityResponses(StudioMessages messages, ResultLocalizer resultLocalizer) {
        this.messages = messages;
        this.resultLocalizer = resultLocalizer;
    }

    public void badRequest(HttpServletResponse response, String messageOrKey) throws IOException {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        writeJson(response, 400, resolve(messageOrKey, "security.client.bad_request"));
    }

    public void unauthorized(HttpServletResponse response, String messageOrKey) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        writeJson(response, 401, resolve(messageOrKey, "result.auth.token_expired"));
    }

    public void forbidden(HttpServletResponse response, String messageOrKey) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        writeJson(response, 403, resolve(messageOrKey, "result.forbidden"));
    }

    public void staleCrypto(HttpServletResponse response, String messageOrKey) throws IOException {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("X-Crypto-Stale", "1");
        String safe = escapeJson(resolve(messageOrKey, "security.client.crypto_route_stale"));
        response.getOutputStream().write(
            ("{\"code\":404,\"message\":\"" + safe + "\",\"cryptoStale\":true}").getBytes(StandardCharsets.UTF_8)
        );
    }

    private String resolve(String messageOrKey, String fallbackKey) {
        if (messageOrKey == null || messageOrKey.isBlank()) {
            return messages.get(fallbackKey);
        }
        String protocolKey = PROTOCOL_MESSAGE_KEYS.get(messageOrKey);
        if (protocolKey != null) {
            return messages.get(protocolKey);
        }
        return resultLocalizer.resolveLiteral(messageOrKey);
    }

    private static void writeJson(HttpServletResponse response, int code, String message) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        String safe = escapeJson(message);
        response.getOutputStream().write(("{\"code\":" + code + ",\"message\":\"" + safe + "\"}").getBytes(StandardCharsets.UTF_8));
    }

    private static String escapeJson(String message) {
        return message == null ? "" : message.replace("\"", "'");
    }
}
