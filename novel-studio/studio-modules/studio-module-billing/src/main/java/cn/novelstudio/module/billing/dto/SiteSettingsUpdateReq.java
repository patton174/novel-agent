package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SiteSettingsUpdateReq(
    @NotNull(message = "{validation.billing.settings_required}") Map<String, Object> settings
) {
}
