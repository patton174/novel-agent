package cn.novelstudio.module.worker.schedule;

import cn.novelstudio.module.worker.client.InternalNotificationSender;
import cn.novelstudio.module.worker.monitoring.HostMetricsProvider;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp.HostMetrics;
import cn.novelstudio.module.worker.support.AdminUserDirectory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonitoringAlertJobTest {

    @Mock
    private ObjectProvider<HostMetricsProvider> hostMetricsProvider;
    @Mock
    private ObjectProvider<InternalNotificationSender> notificationSender;
    @Mock
    private AdminUserDirectory adminUserDirectory;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private HostMetricsProvider metricsProvider;
    @Mock
    private InternalNotificationSender sender;

    private MonitoringAlertJob job;

    @BeforeEach
    void setUp() {
        job = new MonitoringAlertJob(
            hostMetricsProvider,
            notificationSender,
            adminUserDirectory,
            redisTemplate
        );
        ReflectionTestUtils.setField(job, "cpuPercentThreshold", 90.0);
    }

    @Test
    void run_skipsWhenCpuBelowThreshold() {
        when(hostMetricsProvider.getIfAvailable()).thenReturn(metricsProvider);
        when(metricsProvider.capture()).thenReturn(new HostMetrics(85.0, 1L, 2L, 1L, 2L, 100L));

        job.run();

        verify(valueOperations, never()).setIfAbsent(any(), any(), any(Duration.class));
        verify(notificationSender, never()).getIfAvailable();
    }

    @Test
    void run_notifiesAdminsWhenCpuAboveThresholdAndDedupeAcquired() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(hostMetricsProvider.getIfAvailable()).thenReturn(metricsProvider);
        when(metricsProvider.capture()).thenReturn(new HostMetrics(95.3, 1L, 2L, 1L, 2L, 100L));
        when(valueOperations.setIfAbsent(
            eq(MonitoringAlertJob.DEDUPE_REDIS_KEY),
            eq("95.3"),
            eq(MonitoringAlertJob.DEDUPE_TTL)
        )).thenReturn(true);
        when(notificationSender.getIfAvailable()).thenReturn(sender);
        when(adminUserDirectory.listActiveAdminUserIds()).thenReturn(List.of(10L, 20L));

        job.run();

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(sender).send(eq(10L), eq("system"), eq("notification.monitoring.cpu_high"), payloadCaptor.capture());
        verify(sender).send(eq(20L), eq("system"), eq("notification.monitoring.cpu_high"), payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).containsEntry("cpuPercent", 95.3);
    }

    @Test
    void run_skipsWhenDedupeActive() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(hostMetricsProvider.getIfAvailable()).thenReturn(metricsProvider);
        when(metricsProvider.capture()).thenReturn(new HostMetrics(95.0, 1L, 2L, 1L, 2L, 100L));
        when(valueOperations.setIfAbsent(any(), any(), any(Duration.class))).thenReturn(false);

        job.run();

        verify(notificationSender, never()).getIfAvailable();
    }
}
