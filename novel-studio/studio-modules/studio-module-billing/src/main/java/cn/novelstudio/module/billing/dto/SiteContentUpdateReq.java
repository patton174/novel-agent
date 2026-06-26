package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record SiteContentUpdateReq(
    @NotBlank(message = "{validation.billing.site_title_required}") String title,
    @NotBlank(message = "{validation.billing.site_body_required}") String bodyMd
) {}
