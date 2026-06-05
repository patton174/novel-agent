package com.novel.agent.gateway.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.SecurityRedisKeys;
import com.novel.agent.common.security.WsTicketRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class WsTicketSupport {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public WsTicketSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public WsTicketRecord consume(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }
        String key = SecurityRedisKeys.WS_TICKET_PREFIX + ticket;
        String json = redisTemplate.opsForValue().get(key);
        if (json == null || json.isBlank()) {
            return null;
        }
        redisTemplate.delete(key);
        try {
            return objectMapper.readValue(json, WsTicketRecord.class);
        } catch (JsonProcessingException ex) {
            log.warn("invalid ws ticket payload: {}", ex.getMessage());
            return null;
        }
    }
}
