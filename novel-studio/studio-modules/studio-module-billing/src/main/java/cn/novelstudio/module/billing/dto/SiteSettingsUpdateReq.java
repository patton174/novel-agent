package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SiteSettingsUpdateReq(
    @NotNull Map<String, Object> settings
) {
}
