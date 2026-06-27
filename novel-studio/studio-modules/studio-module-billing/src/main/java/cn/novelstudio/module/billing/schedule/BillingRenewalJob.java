package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.entity.UserSubscriptionEntity;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.repository.UserSubscriptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Monthly billing renewal: advance active subscription periods, expire canceled subs,
 * and audit last month's overage balances.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BillingRenewalJob implements StudioScheduledJob {

    private final UserSubscriptionRepository subRepo;
    private final UsagePeriodSummaryRepository summaryRepo;
    private final AuditLogService auditLogService;

    @Override
    public String jobId() {
        return "billing-renewal-monthly";
    }

    @Override
    public long initialDelayMs() {
        return 120_000;
    }

    @Override
    public long fixedDelayMs() {
        return Duration.ofDays(30).toMillis();
    }

    @Override
    @Transactional
    public void run() {
        log.info("billing renewal job start");
        Instant now = Instant.now();

        List<UserSubscriptionEntity> active = subRepo.findByStatus("active");
        for (UserSubscriptionEntity sub : active) {
            if (sub.getCanceledAt() != null
                && sub.getCurrentPeriodEnd() != null
                && sub.getCurrentPeriodEnd().isBefore(now)) {
                sub.setStatus("inactive");
                subRepo.save(sub);
                continue;
            }
            if (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isBefore(now)) {
                sub.setCurrentPeriodStart(sub.getCurrentPeriodEnd());
                sub.setCurrentPeriodEnd(sub.getCurrentPeriodEnd().plus(30, ChronoUnit.DAYS));
                subRepo.save(sub);
            }
        }

        String lastPeriod = OffsetDateTime.now(ZoneOffset.UTC)
            .minusMonths(1)
            .format(DateTimeFormatter.ofPattern("yyyy-MM"));
        settleOverage(lastPeriod);
        log.info("billing renewal job done");
    }

    private void settleOverage(String period) {
        List<UsagePeriodSummaryEntity> overages =
            summaryRepo.findByPeriodYyyyMmAndOverageMicrosGreaterThan(period, 0L);
        for (UsagePeriodSummaryEntity s : overages) {
            auditLogService.log(
                0L,
                "overage.settle",
                "user",
                String.valueOf(s.getUserId()),
                null,
                Map.of("period", period, "overageMicros", s.getOverageMicros())
            );
        }
    }
}
