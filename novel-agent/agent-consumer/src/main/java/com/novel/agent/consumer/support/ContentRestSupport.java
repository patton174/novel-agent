package com.novel.agent.consumer.support;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Consumer → Content 服务 HTTP 调用封装（auth 路径与 internal 路径）。
 */
@Component
public class ContentRestSupport {

    public static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";
    public static final String USER_ID_HEADER = "X-User-Id";

    private final RestClient contentRestClient;
    private final String internalServiceKey;

    public ContentRestSupport(
        @Qualifier("contentRestClient") RestClient contentRestClient,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        this.contentRestClient = contentRestClient;
        this.internalServiceKey = internalServiceKey;
    }

    public void postAuth(String uriTemplate, long userId, Object body, Object... uriVariables) {
        contentRestClient.post()
            .uri(uriTemplate, uriVariables)
            .contentType(MediaType.APPLICATION_JSON)
            .header(USER_ID_HEADER, Long.toString(userId))
            .body(body)
            .retrieve()
            .toBodilessEntity();
    }

    public void postInternal(String uriTemplate, Object body, Object... uriVariables) {
        contentRestClient.post()
            .uri(uriTemplate, uriVariables)
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, internalServiceKey)
            .body(body)
            .retrieve()
            .toBodilessEntity();
    }

    public <T> T postInternal(String uriTemplate, Object body, Class<T> responseType, Object... uriVariables) {
        return contentRestClient.post()
            .uri(uriTemplate, uriVariables)
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, internalServiceKey)
            .body(body)
            .retrieve()
            .body(responseType);
    }

    public <T> T getInternal(String uriTemplate, Class<T> responseType, Object... uriVariables) {
        return contentRestClient.get()
            .uri(uriTemplate, uriVariables)
            .header(INTERNAL_KEY_HEADER, internalServiceKey)
            .retrieve()
            .body(responseType);
    }
}
