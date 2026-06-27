package cn.novelstudio.module.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SendNotificationReq(
    @NotNull Long userId,
    @NotBlank String category,
    String titleKey,
    String bodyKey,
    String titleText,
    String bodyText,
    Map<String, Object> payload
) {}
