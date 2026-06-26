package cn.novelstudio.platform.scheduling;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public void runExclusive(String jobId, Duration lockTtl, Runnable task) {
        if (!properties.isEnabled()) {
            task.run();
            return;
        }
        String key = SchedulingRedisKeys.JOB_LOCK_PREFIX + jobId;
        Boolean acquired = redis.opsForValue().setIfAbsent(key, "1", lockTtl);
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("skip job {} — lock held by another instance", jobId);
            return;
        }
        try {
            task.run();
        } finally {
            redis.delete(key);
        }
    }

    public void runExclusive(String jobId, Runnable task) {
        runExclusive(jobId, Duration.ofSeconds(properties.getDefaultLockSeconds()), task);
    }
}
