package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.crawl.CrawlDispatchMessage;
import com.novel.agent.consumer.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class CrawlDispatchListener {

    private static final Logger log = LoggerFactory.getLogger(CrawlDispatchListener.class);

    private final ObjectMapper objectMapper;
    private final RestClient pythonRestClient;
    private final String internalServiceKey;

    public CrawlDispatchListener(
        ObjectMapper objectMapper,
        @Qualifier("pythonRestClient") RestClient pythonRestClient,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        this.objectMapper = objectMapper;
        this.pythonRestClient = pythonRestClient;
        this.internalServiceKey = internalServiceKey;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.crawl.dispatch.queue", durable = "true"))
    public void onDispatch(String message) {
        MqListenerSupport.safeHandle(log, message, "crawl.dispatch failed", this::handle);
    }

    private void handle(String message) throws Exception {
        CrawlDispatchMessage payload = objectMapper.readValue(message, CrawlDispatchMessage.class);
        log.info("crawl.dispatch received jobId={} attempt={}", payload.jobId(), payload.attempt());
        Map<String, Object> siteConfig = Map.of();
        if (payload.configJson() != null && !payload.configJson().isBlank()) {
            siteConfig = objectMapper.readValue(
                payload.configJson(),
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}
            );
        }
        var body = objectMapper.createObjectNode();
        body.put("job_id", payload.jobId());
        body.put("source_url", payload.sourceUrl());
        if (!siteConfig.isEmpty()) {
            body.set("site_config", objectMapper.valueToTree(siteConfig));
        }
        String jsonBody = objectMapper.writeValueAsString(body);
        pythonRestClient.post()
            .uri("/internal/crawl/execute")
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-Internal-Service-Key", internalServiceKey)
            .body(jsonBody.getBytes(StandardCharsets.UTF_8))
            .retrieve()
            .toBodilessEntity();
    }
}
