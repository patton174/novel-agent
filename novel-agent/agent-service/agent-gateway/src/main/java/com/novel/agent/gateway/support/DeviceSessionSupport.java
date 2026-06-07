package com.novel.agent.gateway.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.DeviceSessionRecord;
import com.novel.agent.common.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Slf4j
@Component
public class DeviceSessionSupport {

    private static final String DEVICE_PREFIX = SecurityRedisKeys.DEVICE_PREFIX;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public DeviceSessionSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Mono<DeviceSessionRecord> load(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Mono.empty();
        }
        return Mono.fromCallable(() -> {
            String json = redisTemplate.opsForValue().get(DEVICE_PREFIX + sessionId);
            if (json == null || json.isBlank()) {
                return null;
            }
            try {
                return objectMapper.readValue(json, DeviceSessionRecord.class);
            } catch (JsonProcessingException ex) {
                log.warn("invalid device session sid={}: {}", sessionId, ex.getMessage());
                return null;
            }
        }).subscribeOn(Schedulers.boundedElastic()).flatMap(record -> record == null ? Mono.empty() : Mono.just(record));
    }
}
