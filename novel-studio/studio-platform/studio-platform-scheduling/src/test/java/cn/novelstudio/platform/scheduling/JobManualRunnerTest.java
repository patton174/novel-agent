package cn.novelstudio.platform.scheduling;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobManualRunnerTest {

    @Mock
    private StudioScheduledJob job;

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOps;

    @Mock
    private ScheduledJobRunRecorder recorder;

    @Mock
    private ObjectProvider<ScheduledJobRunRecorder> recorderProvider;

    private StudioJobRunner runner;
    private JobManualRunner manualRunner;
    private final AtomicBoolean jobRan = new AtomicBoolean(false);

    @BeforeEach
    void setUp() throws Exception {
        StudioSchedulingProperties properties = new StudioSchedulingProperties();
        properties.setEnabled(true);
        properties.setDefaultLockSeconds(60);

        SchedulingInstanceId instanceId = new SchedulingInstanceId(properties);

        when(recorderProvider.getIfAvailable()).thenReturn(recorder);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.setIfAbsent(eq("studio:job:lock:test-job"), eq("1"), any(Duration.class)))
            .thenReturn(true);

        runner = new StudioJobRunner(redis, properties, recorderProvider, instanceId);

        TaskScheduler taskScheduler = new ImmediateTaskScheduler();

        manualRunner = new JobManualRunner(
            List.of(job),
            runner,
            properties,
            taskScheduler,
            recorderProvider,
            instanceId
        );

        when(job.jobId()).thenReturn("test-job");
        jobRan.set(false);
        doAnswer(invocation -> {
            jobRan.set(true);
            return null;
        }).when(job).run();
    }

    @Test
    void runNowExecutesJobAndRecordsHistory() throws Exception {
        when(recorder.recordStart(
            eq("test-job"),
            eq(ScheduledJobRunRecorder.TriggerType.MANUAL),
            any()
        )).thenReturn(42L);

        long runId = manualRunner.runNow("test-job");

        assertThat(runId).isEqualTo(42L);
        assertThat(jobRan).isTrue();
        verify(recorder).recordSuccess(42L);
    }

    @Test
    void runNowUnknownJobThrows() {
        assertThatThrownBy(() -> manualRunner.runNow("missing"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("missing");
    }

    @Test
    void runNowMarksFailureWhenLockHeld() throws Exception {
        when(valueOps.setIfAbsent(eq("studio:job:lock:test-job"), eq("1"), any(Duration.class)))
            .thenReturn(false);
        when(recorder.recordStart(
            eq("test-job"),
            eq(ScheduledJobRunRecorder.TriggerType.MANUAL),
            any()
        )).thenReturn(7L);

        long runId = manualRunner.runNow("test-job");

        assertThat(runId).isEqualTo(7L);
        assertThat(jobRan).isFalse();
        verify(recorder).recordFailure(eq(7L), eq("lock held by another instance"));
    }

    @Test
    void existsReflectsRegisteredJobs() {
        assertThat(manualRunner.exists("test-job")).isTrue();
        assertThat(manualRunner.exists("other")).isFalse();
    }

    private static final class ImmediateTaskScheduler implements TaskScheduler {

        @Override
        public ScheduledFuture<?> schedule(Runnable task, Instant startTime) {
            task.run();
            return mock(ScheduledFuture.class);
        }

        @Override
        public ScheduledFuture<?> schedule(Runnable task, Trigger trigger) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Instant startTime, Duration period) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Duration period) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Instant startTime, Duration delay) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Duration delay) {
            throw new UnsupportedOperationException();
        }
    }
}
