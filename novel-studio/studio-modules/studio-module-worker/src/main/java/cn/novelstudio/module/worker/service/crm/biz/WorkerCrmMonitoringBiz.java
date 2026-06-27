package cn.novelstudio.module.worker.service.crm.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.worker.monitoring.HostMetricsProvider;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.HostMetrics;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.JvmMetrics;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.ServiceProbe;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class WorkerCrmMonitoringBiz extends BaseBiz {

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

    private final DataSource dataSource;
    private final StringRedisTemplate redisTemplate;
    private final ObjectProvider<RabbitTemplate> rabbitTemplate;
    private final ObjectProvider<HostMetricsProvider> hostMetricsProvider;

    @Value("${agent.python.base-url:${python-ai.base-url:http://127.0.0.1:8000}}")
    private String pythonAiBaseUrl;

    public Result<MonitoringSnapshotResp> snapshot() {
        return ok(new MonitoringSnapshotResp(
            captureHost(),
            captureServices(),
            captureJvm()
        ));
    }

    private HostMetrics captureHost() {
        HostMetricsProvider provider = hostMetricsProvider.getIfAvailable();
        if (provider != null) {
            return provider.capture();
        }
        return fallbackHostMetrics();
    }

    private HostMetrics fallbackHostMetrics() {
        Double cpuPercent = null;
        Long memoryUsedMb = null;
        Long memoryTotalMb = null;
        try {
            var os = ManagementFactory.getOperatingSystemMXBean();
            if (os instanceof com.sun.management.OperatingSystemMXBean sunOs) {
                double load = sunOs.getCpuLoad();
                if (load >= 0) {
                    cpuPercent = Math.round(load * 1000.0) / 10.0;
                }
                long total = sunOs.getTotalMemorySize();
                long free = sunOs.getFreeMemorySize();
                if (total > 0) {
                    memoryTotalMb = total / (1024 * 1024);
                    memoryUsedMb = (total - free) / (1024 * 1024);
                }
            }
        } catch (Exception ignored) {
            // JMX host metrics unavailable on this JVM
        }

        long diskTotal = 0;
        long diskFree = 0;
        for (File root : File.listRoots()) {
            diskTotal += root.getTotalSpace();
            diskFree += root.getUsableSpace();
        }
        Long diskTotalGb = diskTotal > 0 ? diskTotal / (1024 * 1024 * 1024) : null;
        Long diskUsedGb = diskTotal > 0 ? (diskTotal - diskFree) / (1024 * 1024 * 1024) : null;

        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
        long uptimeSeconds = runtime.getUptime() / 1000;

        return new HostMetrics(cpuPercent, memoryUsedMb, memoryTotalMb, diskUsedGb, diskTotalGb, uptimeSeconds);
    }

    private List<ServiceProbe> captureServices() {
        List<ServiceProbe> probes = new ArrayList<>(5);
        probes.add(probeNovelStudio());
        probes.add(probePythonAi());
        probes.add(probePostgresql());
        probes.add(probeRedis());
        probes.add(probeRabbitMq());
        return probes;
    }

    private ServiceProbe probeNovelStudio() {
        long started = System.nanoTime();
        try (Connection conn = dataSource.getConnection()) {
            conn.prepareStatement("SELECT 1").execute();
            long latencyMs = elapsedMs(started);
            return new ServiceProbe("novel-studio", "up", latencyMs);
        } catch (Exception ex) {
            return new ServiceProbe("novel-studio", "down", elapsedMs(started));
        }
    }

    private ServiceProbe probePythonAi() {
        String base = pythonAiBaseUrl == null ? "" : pythonAiBaseUrl.replaceAll("/+$", "");
        if (base.isBlank()) {
            return new ServiceProbe("python-ai", "down", null);
        }
        String url = base + "/api/health";
        long started = System.nanoTime();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
            HttpResponse<Void> response = HTTP.send(request, HttpResponse.BodyHandlers.discarding());
            long latencyMs = elapsedMs(started);
            String status = response.statusCode() >= 200 && response.statusCode() < 300
                ? "up"
                : response.statusCode() == 503 ? "degraded" : "down";
            return new ServiceProbe("python-ai", status, latencyMs);
        } catch (Exception ex) {
            return new ServiceProbe("python-ai", "down", elapsedMs(started));
        }
    }

    private ServiceProbe probePostgresql() {
        long started = System.nanoTime();
        try (Connection conn = dataSource.getConnection();
             var ps = conn.prepareStatement("SELECT 1");
             var rs = ps.executeQuery()) {
            if (rs.next()) {
                return new ServiceProbe("postgresql", "up", elapsedMs(started));
            }
            return new ServiceProbe("postgresql", "degraded", elapsedMs(started));
        } catch (Exception ex) {
            return new ServiceProbe("postgresql", "down", elapsedMs(started));
        }
    }

    private ServiceProbe probeRedis() {
        long started = System.nanoTime();
        try (var conn = redisTemplate.getConnectionFactory().getConnection()) {
            String pong = conn.ping();
            boolean ok = pong != null && !pong.isBlank();
            return new ServiceProbe("redis", ok ? "up" : "degraded", elapsedMs(started));
        } catch (Exception ex) {
            return new ServiceProbe("redis", "down", elapsedMs(started));
        }
    }

    private ServiceProbe probeRabbitMq() {
        RabbitTemplate template = rabbitTemplate.getIfAvailable();
        if (template == null) {
            return new ServiceProbe("rabbitmq", "down", null);
        }
        long started = System.nanoTime();
        try {
            Boolean open = template.execute(channel -> channel.isOpen());
            boolean ok = Boolean.TRUE.equals(open);
            return new ServiceProbe("rabbitmq", ok ? "up" : "degraded", elapsedMs(started));
        } catch (Exception ex) {
            return new ServiceProbe("rabbitmq", "down", elapsedMs(started));
        }
    }

    private JvmMetrics captureJvm() {
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        long heapUsed = memory.getHeapMemoryUsage().getUsed();
        long heapMax = memory.getHeapMemoryUsage().getMax();
        ThreadMXBean threads = ManagementFactory.getThreadMXBean();
        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();

        long heapUsedMb = heapUsed / (1024 * 1024);
        long heapMaxMb = heapMax > 0 ? heapMax / (1024 * 1024) : 0;
        return new JvmMetrics(
            heapUsedMb,
            heapMaxMb,
            threads.getThreadCount(),
            runtime.getUptime() / 1000
        );
    }

    private static long elapsedMs(long startedNano) {
        return Math.max(0, (System.nanoTime() - startedNano) / 1_000_000);
    }
}
