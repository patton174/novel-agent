package com.novel.agent.billing.service.biz;

import com.novel.agent.billing.dto.UsageReportRequest;
import com.novel.agent.billing.entity.ProductPlanEntity;
import com.novel.agent.billing.entity.UsageEventEntity;
import com.novel.agent.billing.entity.UsagePeriodSummaryEntity;
import com.novel.agent.billing.entity.UsagePeriodSummaryId;
import com.novel.agent.billing.repository.UsageEventRepository;
import com.novel.agent.billing.repository.UsagePeriodSummaryRepository;
import com.novel.agent.billing.support.BillingPeriodSupport;
import com.novel.agent.billing.support.BillingRedisKeys;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class UsageReportBiz extends BaseBiz {

    private static final Duration REDIS_TTL = Duration.ofDays(40);

    private final UsageEventRepository usageEventRepository;
    private final UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    private final SubscriptionBiz subscriptionBiz;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public void persistReport(UsageReportRequest request) {
        if (request.userId() == null) {
            badRequest("userId required");
        }
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            if (usageEventRepository.existsByIdempotencyKey(request.idempotencyKey())) {
                return;
            }
        }

        int input = safeInt(request.inputTokens());
        int output = safeInt(request.outputTokens());
        int cacheRead = safeInt(request.cacheReadTokens());
        int cacheWrite = safeInt(request.cacheWriteTokens());
        long tokenDelta = (long) input + output + cacheRead + cacheWrite;
        long cost = request.totalCostMicros() != null ? request.totalCostMicros() : 0L;

        UsageEventEntity event = new UsageEventEntity();
        event.setUserId(request.userId());
        event.setRunId(trimToNull(request.runId()));
        event.setSessionId(trimToNull(request.sessionId()));
        event.setTraceId(trimToNull(request.traceId()));
        event.setEventType(defaultEventType(request.eventType()));
        event.setModel(trimToNull(request.model()));
        event.setInputTokens(input);
        event.setOutputTokens(output);
        event.setCacheReadTokens(cacheRead);
        event.setCacheWriteTokens(cacheWrite);
        event.setTotalCostMicros(cost);
        event.setMetadataJson(request.metadata());
        event.setIdempotencyKey(trimToNull(request.idempotencyKey()));

        try {
            usageEventRepository.save(event);
        } catch (DataIntegrityViolationException ex) {
            return;
        }

        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        upsertPeriodSummary(request.userId(), period, tokenDelta, cost, false);
        incrementRedis(request.userId(), period, tokenDelta, 0);
    }

    @Transactional
    public void recordRunStart(long userId) {
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        upsertPeriodSummary(userId, period, 0L, 0L, true);
        incrementRedis(userId, period, 0L, 1);
    }

    private void upsertPeriodSummary(long userId, String period, long tokenDelta, long costDelta, boolean runInc) {
        ProductPlanEntity plan = subscriptionBiz.resolvePlanForUser(userId);
        UsagePeriodSummaryId id = new UsagePeriodSummaryId();
        id.setUserId(userId);
        id.setPeriodYyyyMm(period);

        UsagePeriodSummaryEntity summary = usagePeriodSummaryRepository.findById(id)
            .orElseGet(() -> {
                UsagePeriodSummaryEntity created = new UsagePeriodSummaryEntity();
                created.setUserId(userId);
                created.setPeriodYyyyMm(period);
                created.setQuotaTokens(plan.getMonthlyTokenQuota());
                created.setQuotaRuns(plan.getMonthlyRunQuota());
                return created;
            });

        summary.setTokensUsed(summary.getTokensUsed() + tokenDelta);
        summary.setCostMicros(summary.getCostMicros() + costDelta);
        if (runInc) {
            summary.setRunsUsed(summary.getRunsUsed() + 1);
        }
        summary.setQuotaTokens(plan.getMonthlyTokenQuota());
        summary.setQuotaRuns(plan.getMonthlyRunQuota());
        usagePeriodSummaryRepository.save(summary);
    }

    private void incrementRedis(long userId, String period, long tokenDelta, int runDelta) {
        if (tokenDelta > 0) {
            String key = BillingRedisKeys.usageTokensKey(userId, period);
            redisTemplate.opsForValue().increment(key, tokenDelta);
            redisTemplate.expire(key, REDIS_TTL);
        }
        if (runDelta > 0) {
            String key = BillingRedisKeys.usageRunsKey(userId, period);
            redisTemplate.opsForValue().increment(key, runDelta);
            redisTemplate.expire(key, REDIS_TTL);
        }
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private static String defaultEventType(String eventType) {
        return eventType == null || eventType.isBlank() ? "llm_call" : eventType.trim();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
