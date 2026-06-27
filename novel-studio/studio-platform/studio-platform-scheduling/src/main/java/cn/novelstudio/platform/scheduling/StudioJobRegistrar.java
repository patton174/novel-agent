package cn.novelstudio.platform.scheduling;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 启动时注册全部 {@link StudioScheduledJob}，读 DB 配置覆盖 delay/cron，支持 Redis 热重载。 */
@Component
@RequiredArgsConstructor
public class StudioJobRegistrar implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(StudioJobRegistrar.class);

    private final TaskScheduler taskScheduler;
    private final List<StudioScheduledJob> jobs;
    private final StudioJobRunner runner;
    private final ScheduledJobConfigRepository configRepository;

    private final List<ScheduledFuture<?>> futures = new ArrayList<>();
    private volatile boolean running;

    @Override
    public void start() {
        if (running) {
            return;
        }
        registerAll();
        running = true;
    }

    /** 取消已注册 future 并按当前 DB 配置重新注册（Redis reload 或本地调用）。 */
    public synchronized void reload() {
        if (!running) {
            return;
        }
        cancelAll();
        registerAll();
        log.info("reloaded {} studio scheduled jobs", futures.size());
    }

    @Override
    public void stop() {
        cancelAll();
        running = false;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }

    private void cancelAll() {
        for (ScheduledFuture<?> future : futures) {
            future.cancel(false);
        }
        futures.clear();
    }

    private void registerAll() {
        Map<String, ScheduledJobConfigEntity> configs = configRepository.findAll().stream()
            .collect(Collectors.toMap(ScheduledJobConfigEntity::getJobId, Function.identity(), (a, b) -> a));

        for (StudioScheduledJob job : jobs) {
            ScheduledJobConfigEntity cfg = configs.get(job.jobId());
            if (cfg != null && !cfg.isEnabled()) {
                log.info("skipped studio job {} — disabled in DB config", job.jobId());
                continue;
            }
            registerJob(job, cfg);
        }
    }

    private void registerJob(StudioScheduledJob job, ScheduledJobConfigEntity cfg) {
        Runnable task = () -> {
            try {
                runner.runExclusive(job.jobId(), () -> {
                    try {
                        job.run();
                    } catch (Exception ex) {
                        throw new RuntimeException(ex);
                    }
                });
            } catch (Exception ex) {
                log.warn("scheduled job {} failed: {}", job.jobId(), ex.getMessage());
            }
        };

        ScheduleType scheduleType = resolveScheduleType(cfg);
        long initialDelayMs = resolveInitialDelayMs(job, cfg);

        ScheduledFuture<?> future;
        if (scheduleType == ScheduleType.CRON) {
            String cron = cfg != null ? cfg.getCronExpression() : null;
            if (cron == null || cron.isBlank()) {
                log.warn("job {} has cron schedule_type but no expression; falling back to fixed delay", job.jobId());
                future = scheduleFixedDelay(task, job, cfg, initialDelayMs);
            } else {
                future = taskScheduler.schedule(task, new CronTrigger(cron.trim()));
                log.info("registered studio job {} (cron={})", job.jobId(), cron.trim());
            }
        } else {
            future = scheduleFixedDelay(task, job, cfg, initialDelayMs);
        }
        futures.add(future);
    }

    private ScheduledFuture<?> scheduleFixedDelay(
        Runnable task,
        StudioScheduledJob job,
        ScheduledJobConfigEntity cfg,
        long initialDelayMs
    ) {
        long intervalMs = resolveFixedDelayMs(job, cfg);
        ScheduledFuture<?> future = taskScheduler.scheduleWithFixedDelay(
            task,
            Instant.now().plusMillis(initialDelayMs),
            Duration.ofMillis(intervalMs)
        );
        log.info(
            "registered studio job {} (delay={}ms interval={}ms)",
            job.jobId(),
            initialDelayMs,
            intervalMs
        );
        return future;
    }

    private static ScheduleType resolveScheduleType(ScheduledJobConfigEntity cfg) {
        if (cfg == null || cfg.getScheduleType() == null || cfg.getScheduleType().isBlank()) {
            return ScheduleType.FIXED_DELAY;
        }
        try {
            return ScheduleType.fromDbValue(cfg.getScheduleType());
        } catch (IllegalArgumentException ex) {
            log.warn("invalid schedule_type {} for job {}, using fixed_delay", cfg.getScheduleType(), cfg.getJobId());
            return ScheduleType.FIXED_DELAY;
        }
    }

    private static long resolveInitialDelayMs(StudioScheduledJob job, ScheduledJobConfigEntity cfg) {
        if (cfg != null && cfg.getInitialDelayMs() != null) {
            return Math.max(0, cfg.getInitialDelayMs());
        }
        return Math.max(0, job.initialDelayMs());
    }

    private static long resolveFixedDelayMs(StudioScheduledJob job, ScheduledJobConfigEntity cfg) {
        if (cfg != null && cfg.getFixedDelayMs() != null) {
            return Math.max(1, cfg.getFixedDelayMs());
        }
        return Math.max(1, job.fixedDelayMs());
    }
}
