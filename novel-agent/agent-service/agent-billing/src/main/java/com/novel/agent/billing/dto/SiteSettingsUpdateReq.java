package com.novel.agent.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SiteSettingsUpdateReq(
    @NotNull Map<String, Object> settings
) {
}
