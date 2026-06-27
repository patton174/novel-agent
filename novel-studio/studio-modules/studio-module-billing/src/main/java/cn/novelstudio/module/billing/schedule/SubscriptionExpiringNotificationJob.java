package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.client.NotificationClient;
import cn.novelstudio.module.billing.entity.UserSubscriptionEntity;
import cn.novelstudio.module.billing.repository.UserSubscriptionRepository;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Daily scan: active subscriptions expiring within 7 days → inbox notification.
 * Dedupe via Redis {@code notification:sub-expiring:{userId}} (7d TTL).
 */
@Slf4j
@Component
public class SubscriptionExpiringNotificationJob implements StudioScheduledJob {

    private static final Duration EXPIRING_WINDOW = Duration.ofDays(7);
    private static final Duration DEDUPE_TTL = Duration.ofDays(7);
    private static final String DEDUPE_KEY_PREFIX = "notification:sub-expiring:";
    private static final DateTimeFormatter EXPIRES_AT_FORMAT =
        DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final StringRedisTemplate redisTemplate;
    private final NotificationClient notificationClient;

    public SubscriptionExpiringNotificationJob(
        UserSubscriptionRepository userSubscriptionRepository,
        StringRedisTemplate redisTemplate,
        @Autowired(required = false) NotificationClient notificationClient
    ) {
        this.userSubscriptionRepository = userSubscriptionRepository;
        this.redisTemplate = redisTemplate;
        this.notificationClient = notificationClient;
    }

    @Override
    public String jobId() {
        return "billing-subscription-expiring-notify";
    }

    @Override
    public long initialDelayMs() {
        return 120_000;
    }

    @Override
    public long fixedDelayMs() {
        return Duration.ofDays(1).toMillis();
    }

    @Override
    public void run() {
        if (notificationClient == null) {
            log.debug("notification client disabled; skip subscription expiring notify");
            return;
        }

        Instant now = Instant.now();
        Instant deadline = now.plus(EXPIRING_WINDOW);
        List<UserSubscriptionEntity> candidates =
            userSubscriptionRepository.findActiveExpiringBetween(now, deadline);

        int sent = 0;
        int skipped = 0;

        for (UserSubscriptionEntity sub : candidates) {
            String dedupeKey = DEDUPE_KEY_PREFIX + sub.getUserId();
            String expiresAtFormatted = EXPIRES_AT_FORMAT.format(sub.getCurrentPeriodEnd());

            Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(dedupeKey, expiresAtFormatted, DEDUPE_TTL);
            if (!Boolean.TRUE.equals(acquired)) {
                skipped++;
                continue;
            }

            notificationClient.sendSubscriptionExpiring(sub.getUserId(), expiresAtFormatted);
            sent++;
        }

        if (!candidates.isEmpty()) {
            log.info(
                "subscription expiring notify: candidates={}, sent={}, skipped={}",
                candidates.size(),
                sent,
                skipped
            );
        }
    }
}
