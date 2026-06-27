package cn.novelstudio.module.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record BroadcastReq(
    @NotBlank String title,
    @NotBlank String body,
    String category
) {}
