package com.novel.agent.common.mq.dto;

public record PermissionSyncMessage(
    Long userId,
    String role
) {}
