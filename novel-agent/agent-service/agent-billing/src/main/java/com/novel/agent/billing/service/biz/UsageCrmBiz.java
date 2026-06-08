package com.novel.agent.billing.service.biz;

import com.novel.agent.billing.dto.*;
import com.novel.agent.billing.entity.UsageEventEntity;
import com.novel.agent.billing.entity.UserQuotaOverrideEntity;
import com.novel.agent.billing.repository.*;
import com.novel.agent.billing.support.BillingPeriodSupport;
import com.novel.agent.billing.support.BillingRedisKeys;
import com.novel.agent.billing.service.AuditLogService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class UsageCrmBiz extends BaseBiz {

    private final UsageQueryBiz usageQueryBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageEventRepository usageEventRepository;
    private final UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final UserQuotaOverrideRepository userQuotaOverrideRepository;
    private final StringRedisTemplate redisTemplate;
    private final AuditLogService auditLogService;

    public Result<UserUsageCrmResp> getUserUsage(long userId) {
        UsageCurrentResp current = usageQueryBiz.currentUsage(userId).data();
        var eventsPage = usageEventRepository.findByUserIdOrderByCreatedAtDesc(
            userId, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<UsageEventResp> events = eventsPage.getContent().stream().map(this::toEventResp).toList();
        List<UserUsageCrmResp.QuotaOverrideSummary> overrides = userQuotaOverrideRepository
            .findActiveByUserId(userId, Instant.now()).stream()
            .map(o -> new UserUsageCrmResp.QuotaOverrideSummary(
                o.getId(),
                o.getTokenBonus() == null ? 0L : o.getTokenBonus(),
                o.getRunBonus() == null ? 0 : o.getRunBonus(),
                o.getReason(),
                o.getExpiresAt()
            ))
            .toList();

        return ok(new UserUsageCrmResp(
            userId,
            current.periodYyyyMm(),
            current.planCode(),
            current.planName(),
            current.tokensUsed(),
            current.tokenQuota(),
            current.runsUsed(),
            current.runQuota(),
            current.costMicros(),
            current.percentUsed(),
            events,
            overrides
        ));
    }

    @Transactional
    public Result<Void> addQuotaOverride(long userId, QuotaOverrideReq req, Long actorId) {
        subscriptionBiz.ensureDefaultSubscription(userId);
        UserQuotaOverrideEntity entity = new UserQuotaOverrideEntity();
        entity.setUserId(userId);
        entity.setTokenBonus(req.tokenBonus() == null ? 0L : req.tokenBonus());
        entity.setRunBonus(req.runBonus() == null ? 0 : req.runBonus());
        entity.setReason(req.reason());
        entity.setExpiresAt(req.expiresAt());
        entity.setCreatedBy(actorId);
        userQuotaOverrideRepository.save(entity);
        invalidateUsageCache(userId);
        auditLogService.log(
            actorId,
            "user.quota.override",
            "user",
            String.valueOf(userId),
            null,
            Map.of(
                "tokenBonus", entity.getTokenBonus(),
                "runBonus", entity.getRunBonus(),
                "reason", entity.getReason() == null ? "" : entity.getReason()
            )
        );
        return ok();
    }

    public Result<PlatformUsageOverviewResp> platformOverview() {
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        Object[] periodSum = usagePeriodSummaryRepository.sumByPeriod(period);
        long monthTokens = periodSum[0] == null ? 0L : ((Number) periodSum[0]).longValue();
        long monthCost = periodSum[1] == null ? 0L : ((Number) periodSum[1]).longValue();

        Instant monthStart = BillingPeriodSupport.monthStartUtc(period);
        List<PlatformUsageOverviewResp.ModelBreakdownItem> models = new ArrayList<>();
        for (Object[] row : usageEventRepository.sumByModelSince(monthStart)) {
            String model = row[0] == null ? "unknown" : row[0].toString();
            long tokens = row[1] == null ? 0L : ((Number) row[1]).longValue();
            long cost = row[2] == null ? 0L : ((Number) row[2]).longValue();
            models.add(new PlatformUsageOverviewResp.ModelBreakdownItem(model, tokens, cost));
        }

        Map<String, Long> activeSubs = new HashMap<>();
        for (Object[] row : userSubscriptionRepository.countActiveByPlanCode()) {
            activeSubs.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        long mrrCents = userSubscriptionRepository.sumMrrCents() == null ? 0L : userSubscriptionRepository.sumMrrCents();
        long monthRevenueMicros = mrrCents * 10_000L;

        return ok(new PlatformUsageOverviewResp(
            mrrCents,
            activeSubs,
            monthTokens,
            monthCost,
            monthRevenueMicros,
            models
        ));
    }

    public Result<PlatformUsageTrendsResp> platformTrends(int days) {
        int window = Math.min(Math.max(days, 1), 365);
        Instant since = Instant.now().minus(window, ChronoUnit.DAYS);
        List<PlatformUsageTrendsResp.UsageTrendPoint> points = new ArrayList<>();
        for (Object[] row : usageEventRepository.sumDailyPlatformSince(since)) {
            LocalDate day = ((java.sql.Date) row[0]).toLocalDate();
            long tokens = row[1] == null ? 0L : ((Number) row[1]).longValue();
            long cost = row[2] == null ? 0L : ((Number) row[2]).longValue();
            points.add(new PlatformUsageTrendsResp.UsageTrendPoint(day.toString(), tokens, cost));
        }
        return ok(new PlatformUsageTrendsResp(points));
    }

    private UsageEventResp toEventResp(UsageEventEntity e) {
        long totalTokens = (long) e.getInputTokens() + e.getOutputTokens()
            + e.getCacheReadTokens() + e.getCacheWriteTokens();
        return new UsageEventResp(
            e.getId(),
            e.getRunId(),
            e.getSessionId(),
            e.getTraceId(),
            e.getEventType(),
            e.getModel(),
            e.getInputTokens(),
            e.getOutputTokens(),
            totalTokens,
            e.getTotalCostMicros(),
            e.getCreatedAt(),
            e.getMetadataJson()
        );
    }

    private void invalidateUsageCache(long userId) {
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        redisTemplate.delete(BillingRedisKeys.usageTokensKey(userId, period));
        redisTemplate.delete(BillingRedisKeys.usageRunsKey(userId, period));
    }
}
