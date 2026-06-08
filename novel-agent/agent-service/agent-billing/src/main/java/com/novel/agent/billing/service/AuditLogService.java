package com.novel.agent.billing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.billing.entity.AuditLogEntity;
import com.novel.agent.billing.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(
        Long actorId,
        String action,
        String targetType,
        String targetId,
        Object before,
        Object after
    ) {
        if (actorId == null || actorId <= 0) {
            actorId = 0L;
        }
        AuditLogEntity entry = new AuditLogEntity();
        entry.setActorId(actorId);
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setBeforeJson(toJson(before));
        entry.setAfterJson(toJson(after));
        auditLogRepository.save(entry);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            log.warn("audit log json serialize failed: {}", ex.getMessage());
            return null;
        }
    }
}
