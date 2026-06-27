package cn.novelstudio.module.notification.dto;

import java.time.Instant;
import java.util.Map;

public record NotificationItemResp(
    Long id,
    String category,
    String title,
    String body,
    Map<String, Object> payload,
    boolean read,
    Instant createdAt
) {}
