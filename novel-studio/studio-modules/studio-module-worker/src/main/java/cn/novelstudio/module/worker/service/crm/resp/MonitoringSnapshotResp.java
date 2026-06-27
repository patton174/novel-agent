package cn.novelstudio.module.worker.service.crm.resp;

import java.util.List;

public record MonitoringSnapshotResp(
    HostMetrics host,
    List<ServiceProbe> services,
    JvmMetrics jvm
) {
    public record HostMetrics(
        Double cpuPercent,
        Long memoryUsedMb,
        Long memoryTotalMb,
        Long diskUsedGb,
        Long diskTotalGb,
        Long uptimeSeconds
    ) {
    }

    public record ServiceProbe(
        String id,
        String status,
        Long latencyMs
    ) {
    }

    public record JvmMetrics(
        long heapUsedMb,
        long heapMaxMb,
        int threads,
        long uptimeSeconds
    ) {
    }
}
