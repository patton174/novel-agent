package cn.novelstudio.module.billing.client;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class NotificationClientTest {

    private static final String INTERNAL_KEY = "test-internal-key";

    private MockRestServiceServer server;
    private NotificationClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost");
        server = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        client = new NotificationClient(restClient, INTERNAL_KEY);
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    void sendSubscriptionExpiring_postsBillingPayloadWithExpiresAt() {
        server.expect(requestTo("http://localhost/internal/notification/send"))
            .andExpect(method(POST))
            .andExpect(header("X-Internal-Service-Key", INTERNAL_KEY))
            .andExpect(content().json("""
                {
                  "userId": 42,
                  "category": "billing",
                  "titleKey": "notification.billing.subscription_expiring",
                  "payload": { "expiresAtFormatted": "2026-07-01" }
                }
                """))
            .andRespond(withSuccess());

        client.sendSubscriptionExpiring(42L, "2026-07-01");
    }

    @Test
    void sendUploadComplete_postsAgentCategoryWithoutPayload() {
        server.expect(requestTo("http://localhost/internal/notification/send"))
            .andExpect(method(POST))
            .andExpect(header("X-Internal-Service-Key", INTERNAL_KEY))
            .andExpect(content().json("""
                {
                  "userId": 7,
                  "category": "agent",
                  "titleKey": "notification.agent.upload_complete"
                }
                """))
            .andRespond(withSuccess());

        client.sendUploadComplete(7L);
    }

    @Test
    void sendSystemAlert_postsTitleAndBodyKeysWithPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("detail", "disk 90%");

        server.expect(requestTo("http://localhost/internal/notification/send"))
            .andExpect(method(POST))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "userId": 99,
                  "category": "system",
                  "titleKey": "notification.system.maintenance",
                  "bodyKey": "notification.system.maintenance",
                  "payload": { "detail": "disk 90%" }
                }
                """))
            .andRespond(withSuccess());

        client.sendSystemAlert(
            99L,
            "notification.system.maintenance",
            "notification.system.maintenance",
            payload
        );
    }

    @Test
    void sendToAdmins_postsOncePerAdminUserId() {
        Map<String, Object> payload = Map.of("severity", "critical");

        server.expect(requestTo("http://localhost/internal/notification/send"))
            .andExpect(content().json("""
                {
                  "userId": 1,
                  "category": "system",
                  "titleKey": "notification.system.maintenance",
                  "bodyKey": "notification.system.maintenance",
                  "payload": { "severity": "critical" }
                }
                """))
            .andRespond(withSuccess());
        server.expect(requestTo("http://localhost/internal/notification/send"))
            .andExpect(content().json("""
                {
                  "userId": 2,
                  "category": "system",
                  "titleKey": "notification.system.maintenance",
                  "bodyKey": "notification.system.maintenance",
                  "payload": { "severity": "critical" }
                }
                """))
            .andRespond(withSuccess());

        client.sendToAdmins(
            List.of(1L, 2L),
            "notification.system.maintenance",
            "notification.system.maintenance",
            payload
        );
    }

    @Test
    void sendToAdmins_skipsWhenUserIdsEmpty() {
        client.sendToAdmins(List.of(), "notification.system.maintenance", null, null);
    }
}
