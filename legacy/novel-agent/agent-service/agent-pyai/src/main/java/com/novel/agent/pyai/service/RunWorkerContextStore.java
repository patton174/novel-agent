package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.pyai.dto.agent.AgentRunContextDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Staging area for worker dispatch: assembled run context keyed by runId.
 */
@Component
public class RunWorkerContextStore {

    private static final Logger log = LoggerFactory.getLogger(RunWorkerContextStore.class);
    private static final String KEY_PREFIX = "run:worker:ctx:";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RunWorkerContextStore(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void save(String runId, AgentRunContextDto context) {
        if (runId == null || runId.isBlank() || context == null) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(context);
            redisTemplate.opsForValue().set(KEY_PREFIX + runId, json, TTL);
        } catch (Exception ex) {
            log.warn("save worker context failed runId={}: {}", runId, ex.getMessage());
        }
    }

    public AgentRunContextDto load(String runId) {
        if (runId == null || runId.isBlank()) {
            return null;
        }
        try {
            String json = redisTemplate.opsForValue().get(KEY_PREFIX + runId);
            if (json == null || json.isBlank()) {
                return null;
            }
            return objectMapper.readValue(json, AgentRunContextDto.class);
        } catch (Exception ex) {
            log.warn("load worker context failed runId={}: {}", runId, ex.getMessage());
            return null;
        }
    }
}
