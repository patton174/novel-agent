package cn.novelstudio.module.worker.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Calls monolith {@code POST /internal/notification/send} to write user inbox entries.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "notification.enabled", havingValue = "true", matchIfMissing = true)
public class InternalNotificationSender {

    private final RestClient restClient;
    private final String internalKey;

    public InternalNotificationSender(
        @Value("${notification.internal.base-url:http://127.0.0.1:${server.port:8080}}") String baseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey
    ) {
        this.internalKey = internalKey;
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl.replaceAll("/+$", ""))
            .build();
    }

    public void send(long userId, String category, String titleKey, Map<String, Object> payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("userId", userId);
        body.put("category", category);
        body.put("titleKey", titleKey);
        if (payload != null && !payload.isEmpty()) {
            body.put("payload", payload);
        }

        try {
            restClient.post()
                .uri("/internal/notification/send")
                .header("X-Internal-Service-Key", internalKey)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn(
                "internal notification failed userId={} category={} titleKey={}: {}",
                userId,
                category,
                titleKey,
                ex.getMessage()
            );
        }
    }
}
