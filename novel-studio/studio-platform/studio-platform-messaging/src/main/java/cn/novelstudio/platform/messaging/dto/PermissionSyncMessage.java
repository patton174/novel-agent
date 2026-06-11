package cn.novelstudio.platform.messaging.dto;

public record PermissionSyncMessage(
    Long userId,
    String role
) {}
