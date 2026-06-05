package com.novel.agent.auth.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.SecurityRedisKeys;
import com.novel.agent.common.security.WsTicketRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
public class WsTicketService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final long ticketTtlSeconds;

    public WsTicketService(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        @Value("${auth.client-security.ws-ticket-ttl-seconds:60}") long ticketTtlSeconds
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ticketTtlSeconds = ticketTtlSeconds;
    }

    public String issue(Long userId, String sessionId, String purpose, String resourceId) {
        String ticket = "wt_" + UUID.randomUUID().toString().replace("-", "");
        WsTicketRecord record = new WsTicketRecord(userId, sessionId, purpose, resourceId);
        try {
            redisTemplate.opsForValue().set(
                SecurityRedisKeys.WS_TICKET_PREFIX + ticket,
                objectMapper.writeValueAsString(record),
                Duration.ofSeconds(ticketTtlSeconds)
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
        return ticket;
    }

    public long ticketTtlSeconds() {
        return ticketTtlSeconds;
    }
}
