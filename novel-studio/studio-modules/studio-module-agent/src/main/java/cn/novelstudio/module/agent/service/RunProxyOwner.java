package cn.novelstudio.module.agent.service;

/**
 * Java pod that owns an in-flight agent run (proxies Python SSE or anchors queued dispatch).
 */
public record RunProxyOwner(
    String runId,
    String instanceId,
    String internalBaseUrl,
    long heartbeatAtEpochMs
) {
    public boolean isAlive(long ttlMillis, long nowEpochMs) {
        return heartbeatAtEpochMs > 0 && (nowEpochMs - heartbeatAtEpochMs) <= ttlMillis;
    }
}
