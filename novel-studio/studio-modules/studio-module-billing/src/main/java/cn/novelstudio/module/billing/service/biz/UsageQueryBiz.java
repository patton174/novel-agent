package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.QuotaCheckResp;
import cn.novelstudio.module.billing.dto.UsageCurrentResp;
import cn.novelstudio.module.billing.dto.UsageEventResp;
import cn.novelstudio.module.billing.dto.UsageTrendsResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UsageEventEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryId;
import cn.novelstudio.module.billing.repository.UsageEventRepository;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.support.BillingPeriodSupport;
import cn.novelstudio.module.billing.support.BillingRedisKeys;
import cn.novelstudio.module.billing.support.EffectiveQuotaSupport;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class UsageQueryBiz extends BaseBiz {

    private final UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    private final UsageEventRepository usageEventRepository;
    private final SubscriptionBiz subscriptionBiz;
    private final StringRedisTemplate redisTemplate;
    private final EffectiveQuotaSupport effectiveQuotaSupport;

    public Result<UsageCurrentResp> currentUsage(long userId) {
        ProductPlanEntity plan = subscriptionBiz.resolvePlanForUser(userId);
        var effective = effectiveQuotaSupport.resolve(userId, plan);
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        UsagePeriodSummaryEntity summary = loadSummary(userId, period, plan);

        long tokensUsed = summary.getTokensUsed();
        int runsUsed = summary.getRunsUsed();
        Long tokenQuota = effective.tokenQuota();
        Integer runQuota = effective.runQuota();
        double percent = tokenQuota == null || tokenQuota <= 0
            ? 0.0
            : Math.min(100.0, tokensUsed * 100.0 / tokenQuota);
        boolean warn = percent >= 80.0;

        var sub = subscriptionBiz.ensureDefaultSubscription(userId);
        return ok(new UsageCurrentResp(
            period,
            tokensUsed,
            tokenQuota,
            runsUsed,
            runQuota,
            summary.getCostMicros(),
            Math.round(percent * 10.0) / 10.0,
            warn,
            plan.getCode(),
            plan.getName(),
            sub.getCurrentPeriodEnd()
        ));
    }

    public Result<UsageTrendsResp> trends(long userId, int days) {
        int window = Math.min(Math.max(days, 1), 365);
        Instant since = Instant.now().minus(window, ChronoUnit.DAYS);
        List<UsageTrendsResp.UsageTrendPoint> points = new ArrayList<>();
        for (Object[] row : usageEventRepository.sumDailySince(userId, since)) {
            LocalDate day = ((java.sql.Date) row[0]).toLocalDate();
            long tokens = row[1] == null ? 0L : ((Number) row[1]).longValue();
            long cost = row[2] == null ? 0L : ((Number) row[2]).longValue();
            points.add(new UsageTrendsResp.UsageTrendPoint(day.toString(), tokens, cost));
        }
        return ok(new UsageTrendsResp(points));
    }

    public Result<Page<UsageEventResp>> listEvents(long userId, int pageCurrent, int pageSize, String runId) {
        var pageable = PageRequest.of(Math.max(pageCurrent - 1, 0), Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "createdAt"));
        var page = runId == null || runId.isBlank()
            ? usageEventRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
            : usageEventRepository.findByUserIdAndRunIdOrderByCreatedAtDesc(userId, runId.trim(), pageable);
        List<UsageEventResp> list = page.getContent().stream().map(this::toEventResp).toList();
        return ok(Page.of(list, page.getTotalElements(), pageCurrent, pageSize));
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

    private UsagePeriodSummaryEntity loadSummary(long userId, String period, ProductPlanEntity plan) {
        UsagePeriodSummaryId id = new UsagePeriodSummaryId();
        id.setUserId(userId);
        id.setPeriodYyyyMm(period);
        return usagePeriodSummaryRepository.findById(id).orElseGet(() -> {
            UsagePeriodSummaryEntity empty = new UsagePeriodSummaryEntity();
            empty.setUserId(userId);
            empty.setPeriodYyyyMm(period);
            empty.setTokensUsed(readRedisLong(BillingRedisKeys.usageTokensKey(userId, period)));
            empty.setRunsUsed((int) readRedisLong(BillingRedisKeys.usageRunsKey(userId, period)));
            empty.setQuotaTokens(plan.getMonthlyTokenQuota());
            empty.setQuotaRuns(plan.getMonthlyRunQuota());
            return empty;
        });
    }

    private long readRedisLong(String key) {
        String raw = redisTemplate.opsForValue().get(key);
        if (raw == null || raw.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }
}
