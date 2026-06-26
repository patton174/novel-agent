package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SiteDanmakuCreateReq(
    @NotBlank(message = "{validation.billing.danmaku_message_required}")
    @Size(min = 2, max = 120, message = "{validation.billing.danmaku_message_size}")
    String message
) {}
