package cn.novelstudio.module.auth.security;

/**
 * Redis {@code auth:refresh:{token}} 载荷；含三层会话时钟（绝对起点 + 末次活动）。
 */
public record RefreshRecord(
    Long userId,
    String sessionId,
    String username,
    String role,
    /** 会话绝对起点（epoch ms）；旧记录缺省为 0，读取时归一化 */
    long sessionStartedAt,
    /** 末次活动（epoch ms）；refresh / heartbeat 更新 */
    long lastActivityAt
) {

    public RefreshRecord withLastActivityAt(long at) {
        return new RefreshRecord(userId, sessionId, username, role, sessionStartedAt, at);
    }
}
