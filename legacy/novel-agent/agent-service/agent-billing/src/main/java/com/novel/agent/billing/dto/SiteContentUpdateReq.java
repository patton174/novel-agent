package com.novel.agent.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record SiteContentUpdateReq(
    @NotBlank String title,
    @NotBlank String bodyMd
) {
}
