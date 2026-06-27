package cn.novelstudio.module.billing.client;



import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import org.springframework.stereotype.Component;

import org.springframework.web.client.RestClient;



import java.util.LinkedHashMap;

import java.util.List;

import java.util.Map;



/**

 * 调用单体 {@code POST /internal/notification/send} 写入用户收件箱。

 * notification 模块未部署或接口不可用时仅打 warn，不影响支付主流程。

 */

@Slf4j

@Component

@ConditionalOnProperty(name = "notification.enabled", havingValue = "true", matchIfMissing = true)

public class NotificationClient {



    private static final String PAYMENT_SUCCESS_TITLE_KEY = "notification.billing.payment_success";
    private static final String SUBSCRIPTION_EXPIRING_TITLE_KEY = "notification.billing.subscription_expiring";
    private static final String UPLOAD_COMPLETE_TITLE_KEY = "notification.agent.upload_complete";



    private final RestClient restClient;

    private final String internalKey;



    @Autowired
    public NotificationClient(

        @Value("${notification.internal.base-url:http://127.0.0.1:${server.port:8080}}") String baseUrl,

        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey

    ) {

        this.internalKey = internalKey;

        this.restClient = RestClient.builder()

            .baseUrl(baseUrl.replaceAll("/+$", ""))

            .build();

    }



    /** Package-private for unit tests. */

    NotificationClient(RestClient restClient, String internalKey) {

        this.restClient = restClient;

        this.internalKey = internalKey;

    }



    public void sendPaymentSuccess(long userId, long orderId) {

        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("orderId", orderId);



        Map<String, Object> body = new LinkedHashMap<>();

        body.put("userId", userId);

        body.put("category", "billing");

        body.put("titleKey", PAYMENT_SUCCESS_TITLE_KEY);

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

                "payment success notification failed userId={} orderId={}: {}",

                userId,

                orderId,

                ex.getMessage()

            );

        }

    }



    public void sendSubscriptionExpiring(long userId, String expiresAtFormatted) {

        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("expiresAtFormatted", expiresAtFormatted);

        send(userId, "billing", SUBSCRIPTION_EXPIRING_TITLE_KEY, null, payload, "subscription expiring");

    }



    public void sendUploadComplete(long userId) {

        send(userId, "agent", UPLOAD_COMPLETE_TITLE_KEY, null, null, "upload complete");

    }



    public void sendSystemAlert(

        long userId,

        String titleKey,

        String bodyKey,

        Map<String, Object> payload

    ) {

        send(userId, "system", titleKey, bodyKey, payload, "system alert");

    }



    public void sendToAdmins(

        List<Long> userIds,

        String titleKey,

        String bodyKey,

        Map<String, Object> payload

    ) {

        if (userIds == null || userIds.isEmpty()) {

            return;

        }

        for (Long userId : userIds) {

            if (userId != null && userId > 0) {

                send(userId, "system", titleKey, bodyKey, payload, "admin alert");

            }

        }

    }



    private void send(

        long userId,

        String category,

        String titleKey,

        String bodyKey,

        Map<String, Object> payload,

        String failureLabel

    ) {

        Map<String, Object> body = new LinkedHashMap<>();

        body.put("userId", userId);

        body.put("category", category);

        body.put("titleKey", titleKey);

        if (bodyKey != null && !bodyKey.isBlank()) {

            body.put("bodyKey", bodyKey);

        }

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

                "{} notification failed userId={}: {}",

                failureLabel,

                userId,

                ex.getMessage()

            );

        }

    }

}

