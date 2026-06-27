package cn.novelstudio.module.notification.schedule;

import cn.novelstudio.module.notification.repository.UserNotificationRepository;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationRetentionJob implements StudioScheduledJob {

    static final int RETENTION_DAYS = 90;
    static final int BATCH_LIMIT = 5000;
    private static final long DAILY_MS = 86_400_000L;

    private final UserNotificationRepository notificationRepository;

    @Override
    public String jobId() {
        return "notification-inbox-retention-purge";
    }

    @Override
    public long initialDelayMs() {
        return 120_000;
    }

    @Override
    public long fixedDelayMs() {
        return DAILY_MS;
    }

    @Override
    @Transactional
    public void run() {
        Instant cutoff = Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS);
        int deleted = notificationRepository.deleteOlderThan(cutoff, BATCH_LIMIT);
        if (deleted > 0) {
            log.info(
                "notification retention purge: deleted {} row(s) older than {} days (cutoff={})",
                deleted,
                RETENTION_DAYS,
                cutoff
            );
        }
    }
}
