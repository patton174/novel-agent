package cn.novelstudio.platform.scheduling;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** 基于 Redis SET NX 的分布式任务锁，保证集群内同一 job 单实例执行。 */
@Component
@RequiredArgsConstructor
public class StudioJobRunner {

    private static final Logger log = LoggerFactory.getLogger(StudioJobRunner.class);

    private final StringRedisTemplate redis;
    private final StudioSchedulingProperties properties;
    private final ObjectProvider<ScheduledJobRunRecorder> runRecorder;
    private final SchedulingInstanceId instanceId;

    public void runExclusive(String jobId, Runnable task) {
        runExclusive(jobId, Duration.ofSeconds(properties.getDefaultLockSeconds()), ScheduledJobRunRecorder.TriggerType.SCHEDULED, null, task);
    }

    public void runExclusive(String jobId, Duration lockTtl, Runnable task) {
        runExclusive(jobId, lockTtl, ScheduledJobRunRecorder.TriggerType.SCHEDULED, null, task);
    }

    /**
     * @param existingRunId 手动触发时预先创建的运行记录 ID；锁未获取时标记失败。
     */
    public void runExclusive(
        String jobId,
        Duration lockTtl,
        ScheduledJobRunRecorder.TriggerType triggerType,
        Long existingRunId,
        Runnable task
    ) {
        if (!properties.isEnabled()) {
            executeWithHistory(jobId, triggerType, existingRunId, task);
            return;
        }
        String key = SchedulingRedisKeys.JOB_LOCK_PREFIX + jobId;
        Boolean acquired = redis.opsForValue().setIfAbsent(key, "1", lockTtl);
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("skip job {} — lock held by another instance", jobId);
            markLockHeldFailure(existingRunId);
            return;
        }
        try {
            executeWithHistory(jobId, triggerType, existingRunId, task);
        } finally {
            redis.delete(key);
        }
    }

    private void executeWithHistory(
        String jobId,
        ScheduledJobRunRecorder.TriggerType triggerType,
        Long existingRunId,
        Runnable task
    ) {
        ScheduledJobRunRecorder recorder = runRecorder.getIfAvailable();
        Long runId = existingRunId;
        if (recorder != null && runId == null) {
            runId = recorder.recordStart(jobId, triggerType, instanceId.get());
        }
        try {
            task.run();
            if (recorder != null && runId != null) {
                recorder.recordSuccess(runId);
            }
        } catch (RuntimeException ex) {
            if (recorder != null && runId != null) {
                recorder.recordFailure(runId, ex.getMessage());
            }
            throw ex;
        }
    }

    private void markLockHeldFailure(Long existingRunId) {
        if (existingRunId == null) {
            return;
        }
        ScheduledJobRunRecorder recorder = runRecorder.getIfAvailable();
        if (recorder != null) {
            recorder.recordFailure(existingRunId, "lock held by another instance");
        }
    }
}
