package cn.novelstudio.module.worker.schedule;

import cn.novelstudio.module.worker.client.InternalNotificationSender;
import cn.novelstudio.module.worker.monitoring.HostMetricsProvider;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.HostMetrics;
import cn.novelstudio.module.worker.support.AdminUserDirectory;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MonitoringAlertJob implements StudioScheduledJob {

    static final String JOB_ID = "worker-monitoring-cpu-alert";
    static final String DEDUPE_REDIS_KEY = "monitoring:cpu-alert:sent";
    static final Duration DEDUPE_TTL = Duration.ofMinutes(30);
    static final String CATEGORY = "system";
    static final String CPU_ALERT_TITLE_KEY = "notification.monitoring.cpu_high";

    private final ObjectProvider<HostMetricsProvider> hostMetricsProvider;
    private final ObjectProvider<InternalNotificationSender> notificationSender;
    private final AdminUserDirectory adminUserDirectory;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.monitoring.alert.cpu-percent-threshold:90}")
    private double cpuPercentThreshold;

    @Value("${app.monitoring.alert.interval-ms:300000}")
    private long intervalMs;

    @Value("${app.monitoring.alert.initial-delay-ms:300000}")
    private long initialDelayMs;

    @Override
    public String jobId() {
        return JOB_ID;
    }

    @Override
    public long initialDelayMs() {
        return initialDelayMs;
    }

    @Override
    public long fixedDelayMs() {
        return intervalMs;
    }

    @Override
    public void run() {
        HostMetricsProvider provider = hostMetricsProvider.getIfAvailable();
        if (provider == null) {
            log.debug("monitoring cpu alert: HostMetricsProvider unavailable, skipping");
            return;
        }

        HostMetrics host = provider.capture();
        Double cpuPercent = host.cpuPercent();
        if (cpuPercent == null || cpuPercent <= cpuPercentThreshold) {
            return;
        }

        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(
            DEDUPE_REDIS_KEY,
            String.valueOf(cpuPercent),
            DEDUPE_TTL
        );
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("monitoring cpu alert: dedupe active (cpuPercent={})", cpuPercent);
            return;
        }

        InternalNotificationSender sender = notificationSender.getIfAvailable();
        if (sender == null) {
            log.warn("monitoring cpu alert: InternalNotificationSender unavailable, cpuPercent={}", cpuPercent);
            redisTemplate.delete(DEDUPE_REDIS_KEY);
            return;
        }

        List<Long> adminUserIds = adminUserDirectory.listActiveAdminUserIds();
        if (adminUserIds.isEmpty()) {
            log.warn("monitoring cpu alert: no active admin users, cpuPercent={}", cpuPercent);
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cpuPercent", roundCpuPercent(cpuPercent));

        for (Long userId : adminUserIds) {
            sender.send(userId, CATEGORY, CPU_ALERT_TITLE_KEY, payload);
        }

        log.warn(
            "monitoring cpu alert: notified {} admin user(s), cpuPercent={} threshold={}",
            adminUserIds.size(),
            cpuPercent,
            cpuPercentThreshold
        );
    }

    private static double roundCpuPercent(double cpuPercent) {
        return Math.round(cpuPercent * 10.0) / 10.0;
    }
}
