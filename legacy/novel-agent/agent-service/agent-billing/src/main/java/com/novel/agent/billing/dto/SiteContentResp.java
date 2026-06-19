package com.novel.agent.billing.dto;

import java.time.Instant;

public record SiteContentResp(
    String contentKey,
    String title,
    String bodyMd,
    String locale,
    Instant updatedAt
) {
}
