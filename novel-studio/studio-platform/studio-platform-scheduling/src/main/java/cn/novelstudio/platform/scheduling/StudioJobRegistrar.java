package cn.novelstudio.platform.scheduling;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ScheduledFuture;

/** 启动时注册全部 {@link StudioScheduledJob}，以 fixedDelay + 分布式锁运行。 */
@Component
@RequiredArgsConstructor
public class StudioJobRegistrar implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(StudioJobRegistrar.class);

    private final TaskScheduler taskScheduler;
    private final List<StudioScheduledJob> jobs;
    private final StudioJobRunner runner;

    private final List<ScheduledFuture<?>> futures = new ArrayList<>();
    private volatile boolean running;

    @Override
    public void start() {
        if (running) {
            return;
        }
        for (StudioScheduledJob job : jobs) {
            ScheduledFuture<?> future = taskScheduler.scheduleWithFixedDelay(
                () -> {
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
                },
                Instant.now().plusMillis(job.initialDelayMs()),
                Duration.ofMillis(Math.max(1, job.fixedDelayMs()))
            );
            futures.add(future);
            log.info("registered studio job {} (delay={}ms interval={}ms)", job.jobId(), job.initialDelayMs(), job.fixedDelayMs());
        }
        running = true;
    }

    @Override
    public void stop() {
        for (ScheduledFuture<?> future : futures) {
            future.cancel(false);
        }
        futures.clear();
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
}
