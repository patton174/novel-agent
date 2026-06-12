package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record SiteDanmakuResp(
    Long id,
    String message,
    String authorName,
    String region,
    Long userId,
    Instant createdAt
) {}
