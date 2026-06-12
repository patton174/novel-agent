package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SiteDanmakuCreateReq(
    @NotBlank @Size(min = 2, max = 120) String message
) {}
