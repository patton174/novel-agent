package cn.novelstudio.module.risk.model;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Redis {@code auth:risk:{sessionId}} 风控快照。
 */
public record RiskSessionState(
    int score,
    Set<String> signalCategories,
    String loginCountry,
    String loginIpPrefix,
    long lastEvaluatedAt,
    int refreshCountInWindow,
    long refreshWindowStartedAt
) {

    public static RiskSessionState empty() {
        return new RiskSessionState(0, new LinkedHashSet<>(), null, null, 0L, 0, 0L);
    }

    public RiskSessionState withEvaluation(int score, Set<String> categories, long now) {
        return new RiskSessionState(
            score,
            categories == null ? Set.of() : Set.copyOf(categories),
            loginCountry,
            loginIpPrefix,
            now,
            refreshCountInWindow,
            refreshWindowStartedAt
        );
    }

    public RiskSessionState withLoginContext(String country, String ipPrefix, long now) {
        return new RiskSessionState(
            score,
            signalCategories,
            country,
            ipPrefix,
            now,
            refreshCountInWindow,
            refreshWindowStartedAt
        );
    }

    public RiskSessionState withRefreshWindow(int count, long windowStart) {
        return new RiskSessionState(
            score,
            signalCategories,
            loginCountry,
            loginIpPrefix,
            lastEvaluatedAt,
            count,
            windowStart
        );
    }
}
