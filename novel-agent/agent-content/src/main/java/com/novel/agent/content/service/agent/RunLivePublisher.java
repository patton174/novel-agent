package com.novel.agent.content.service.agent;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RunLivePublisher {

    private static final String CHANNEL_PREFIX = "run:live:";

    private final StringRedisTemplate redisTemplate;

    public RunLivePublisher(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void publish(String runId, String payloadJson) {
        if (runId == null || runId.isBlank() || payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        redisTemplate.convertAndSend(CHANNEL_PREFIX + runId, payloadJson);
    }
}
