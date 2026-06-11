package cn.novelstudio.platform.security;

import java.util.Map;

/**
 * Redis {@code auth:device:{sessionId}} 热数据快照。
 */
public record DeviceSessionRecord(
    Long userId,
    String sessionId,
    String fpHash,
    Map<String, Object> envSnapshot,
    int riskScore,
    long lastHeartbeatAt,
    long lastSeenAt
) {
}
