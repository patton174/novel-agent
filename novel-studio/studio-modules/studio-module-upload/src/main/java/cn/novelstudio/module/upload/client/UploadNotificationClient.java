package cn.novelstudio.module.upload.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 调用单体 {@code POST /internal/notification/send} 写入用户收件箱。
 * notification 模块未部署或接口不可用时仅打 warn，不影响解析主流程。
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "notification.enabled", havingValue = "true", matchIfMissing = true)
public class UploadNotificationClient {

    private static final String UPLOAD_COMPLETE_TITLE_KEY = "notification.agent.upload_complete";

    private final RestClient restClient;
    private final String internalKey;

    public UploadNotificationClient(
        @Value("${notification.internal.base-url:http://127.0.0.1:${server.port:8080}}") String baseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey
    ) {
        this.internalKey = internalKey;
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl.replaceAll("/+$", ""))
            .build();
    }

    public void sendUploadComplete(long userId, String fileId, String catalogNovelId, String originalName) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("fileId", fileId);
        if (catalogNovelId != null && !catalogNovelId.isBlank()) {
            payload.put("catalogNovelId", catalogNovelId);
        }
        if (originalName != null && !originalName.isBlank()) {
            payload.put("originalName", originalName);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("userId", userId);
        body.put("category", "agent");
        body.put("titleKey", UPLOAD_COMPLETE_TITLE_KEY);
        body.put("payload", payload);

        try {
            restClient.post()
                .uri("/internal/notification/send")
                .header("X-Internal-Service-Key", internalKey)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn(
                "upload complete notification failed userId={} fileId={}: {}",
                userId,
                fileId,
                ex.getMessage()
            );
        }
    }
}
