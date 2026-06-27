package cn.novelstudio.module.worker.monitoring;

import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OshiHostMetricsProviderTest {

    @Test
    void capture_readsHardwareSnapshot() {
        SystemInfo systemInfo = mock(SystemInfo.class);
        HardwareAbstractionLayer hal = mock(HardwareAbstractionLayer.class);
        CentralProcessor processor = mock(CentralProcessor.class);
        GlobalMemory memory = mock(GlobalMemory.class);
        OSFileStore fileStore = mock(OSFileStore.class);
        OperatingSystem os = mock(OperatingSystem.class);

        when(systemInfo.getHardware()).thenReturn(hal);
        when(systemInfo.getOperatingSystem()).thenReturn(os);
        when(hal.getProcessor()).thenReturn(processor);
        when(hal.getMemory()).thenReturn(memory);
        FileSystem fileSystem = mock(FileSystem.class);
        when(os.getFileSystem()).thenReturn(fileSystem);
        when(fileSystem.getFileStores()).thenReturn(List.of(fileStore));

        when(processor.getSystemCpuLoadTicks()).thenReturn(new long[CentralProcessor.TickType.values().length]);
        when(processor.getSystemCpuLoadBetweenTicks(any())).thenReturn(0.25);
        when(memory.getTotal()).thenReturn(16L * 1024 * 1024 * 1024);
        when(memory.getAvailable()).thenReturn(8L * 1024 * 1024 * 1024);
        when(fileStore.getTotalSpace()).thenReturn(500L * 1024 * 1024 * 1024);
        when(fileStore.getUsableSpace()).thenReturn(380L * 1024 * 1024 * 1024);
        when(os.getSystemUptime()).thenReturn(86_400L);

        OshiHostMetricsProvider provider = new OshiHostMetricsProvider(systemInfo, 0L);
        HostMetricsSnapshot snapshot = provider.sample();

        assertThat(snapshot.cpuPercent()).isEqualTo(25.0);
        assertThat(snapshot.memoryTotal()).isEqualTo(16L * 1024 * 1024 * 1024);
        assertThat(snapshot.memoryUsed()).isEqualTo(8L * 1024 * 1024 * 1024);
        assertThat(snapshot.diskTotal()).isEqualTo(500L * 1024 * 1024 * 1024);
        assertThat(snapshot.diskUsed()).isEqualTo(120L * 1024 * 1024 * 1024);
        assertThat(snapshot.uptimeSeconds()).isEqualTo(86_400L);
    }

    @Test
    @Disabled("Integration: samples live host via OSHI with 1s CPU tick interval")
    void capture_integration_liveHost() {
        OshiHostMetricsProvider provider = new OshiHostMetricsProvider();
        HostMetricsSnapshot snapshot = provider.sample();

        assertThat(snapshot.cpuPercent()).isBetween(0.0, 100.0);
        assertThat(snapshot.memoryTotal()).isPositive();
        assertThat(snapshot.memoryUsed()).isBetween(0L, snapshot.memoryTotal());
        assertThat(snapshot.diskTotal()).isPositive();
        assertThat(snapshot.diskUsed()).isBetween(0L, snapshot.diskTotal());
        assertThat(snapshot.uptimeSeconds()).isPositive();
    }
}
