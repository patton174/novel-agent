package cn.novelstudio.module.worker.monitoring;

import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp;

/**
 * Host metrics source — implemented by {@code OshiHostMetricsProvider} (OSHI) when available.
 */
public interface HostMetricsProvider {

    MonitoringSnapshotResp.HostMetrics capture();
}
