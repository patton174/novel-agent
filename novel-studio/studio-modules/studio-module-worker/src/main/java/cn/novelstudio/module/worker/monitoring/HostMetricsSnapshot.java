package cn.novelstudio.module.worker.monitoring;

/**
 * Worker host metrics sampled via OSHI (bytes for memory/disk).
 */
public record HostMetricsSnapshot(
    double cpuPercent,
    long memoryTotal,
    long memoryUsed,
    long diskTotal,
    long diskUsed,
    long uptimeSeconds
) {
}
