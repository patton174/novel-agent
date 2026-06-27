package cn.novelstudio.platform.scheduling;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/** 管理台手动触发 {@link StudioScheduledJob}，仍走 Redis 分布式锁与运行历史。 */
@Component
@RequiredArgsConstructor
public class JobManualRunner {

    private final List<StudioScheduledJob> jobs;
    private final StudioJobRunner runner;
    private final StudioSchedulingProperties properties;
    private final TaskScheduler taskScheduler;
    private final ObjectProvider<ScheduledJobRunRecorder> runRecorder;
    private final SchedulingInstanceId instanceId;

    /**
     * 异步执行指定任务，立即返回已创建的 runId（202 场景）。
     *
     * @throws IllegalArgumentException 未知 jobId
     */
    public long runNow(String jobId) {
        StudioScheduledJob job = findRequired(jobId);
        ScheduledJobRunRecorder recorder = runRecorder.getIfAvailable();
        Long runId = recorder == null
            ? null
            : recorder.recordStart(jobId, ScheduledJobRunRecorder.TriggerType.MANUAL, instanceId.get());

        taskScheduler.schedule(() -> {
            try {
                runner.runExclusive(
                    jobId,
                    Duration.ofSeconds(properties.getDefaultLockSeconds()),
                    ScheduledJobRunRecorder.TriggerType.MANUAL,
                    runId,
                    () -> {
                        try {
                            job.run();
                        } catch (Exception ex) {
                            throw new RuntimeException(ex);
                        }
                    }
                );
            } catch (RuntimeException ex) {
                // runExclusive 已写失败历史；此处仅防止调度线程静默退出
            }
        }, java.time.Instant.now());

        return runId == null ? 0L : runId;
    }

    public boolean exists(String jobId) {
        return jobs.stream().anyMatch(job -> job.jobId().equals(jobId));
    }

    private StudioScheduledJob findRequired(String jobId) {
        return jobs.stream()
            .filter(job -> job.jobId().equals(jobId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("unknown job: " + jobId));
    }
}
