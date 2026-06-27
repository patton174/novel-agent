package cn.novelstudio.module.worker.monitoring;

import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.HostMetrics;
import org.springframework.stereotype.Component;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.util.List;

@Component
public class OshiHostMetricsProvider implements HostMetricsProvider {

    private static final long DEFAULT_CPU_SAMPLE_INTERVAL_MS = 1000L;

    private final SystemInfo systemInfo;
    private final long cpuSampleIntervalMs;

    public OshiHostMetricsProvider() {
        this(new SystemInfo(), DEFAULT_CPU_SAMPLE_INTERVAL_MS);
    }

    OshiHostMetricsProvider(SystemInfo systemInfo, long cpuSampleIntervalMs) {
        this.systemInfo = systemInfo;
        this.cpuSampleIntervalMs = cpuSampleIntervalMs;
    }

    @Override
    public HostMetrics capture() {
        HostMetricsSnapshot snapshot = sample();
        return new HostMetrics(
            snapshot.cpuPercent(),
            snapshot.memoryUsed() / (1024 * 1024),
            snapshot.memoryTotal() / (1024 * 1024),
            snapshot.diskUsed() / (1024 * 1024 * 1024),
            snapshot.diskTotal() / (1024 * 1024 * 1024),
            snapshot.uptimeSeconds()
        );
    }

    HostMetricsSnapshot sample() {
        HardwareAbstractionLayer hal = systemInfo.getHardware();
        OperatingSystem os = systemInfo.getOperatingSystem();
        CentralProcessor processor = hal.getProcessor();

        long[] prevTicks = processor.getSystemCpuLoadTicks();
        sleepCpuSampleInterval();
        double cpuPercent = processor.getSystemCpuLoadBetweenTicks(prevTicks) * 100.0;

        GlobalMemory memory = hal.getMemory();
        long memoryTotal = memory.getTotal();
        long memoryUsed = memoryTotal - memory.getAvailable();

        long diskTotal = 0L;
        long diskUsed = 0L;
        List<OSFileStore> fileStores = os.getFileSystem().getFileStores();
        for (OSFileStore store : fileStores) {
            long storeTotal = store.getTotalSpace();
            long storeUsable = store.getUsableSpace();
            diskTotal += storeTotal;
            diskUsed += storeTotal - storeUsable;
        }

        long uptimeSeconds = os.getSystemUptime();

        return new HostMetricsSnapshot(
            cpuPercent,
            memoryTotal,
            memoryUsed,
            diskTotal,
            diskUsed,
            uptimeSeconds
        );
    }

    private void sleepCpuSampleInterval() {
        if (cpuSampleIntervalMs <= 0L) {
            return;
        }
        try {
            Thread.sleep(cpuSampleIntervalMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted during CPU sampling", e);
        }
    }
}
