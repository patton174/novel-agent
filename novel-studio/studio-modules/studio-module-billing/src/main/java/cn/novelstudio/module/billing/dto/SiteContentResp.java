package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record SiteContentResp(
    String contentKey,
    String title,
    String bodyMd,
    String locale,
    Instant updatedAt,
    String requestedLocale,
    String resolvedLocale,
    boolean localeResolved
) {
}
