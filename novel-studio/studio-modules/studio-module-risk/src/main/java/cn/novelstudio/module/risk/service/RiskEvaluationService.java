package cn.novelstudio.module.risk.service;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.module.risk.model.RiskEvaluationContext;
import cn.novelstudio.module.risk.model.RiskEvaluationResult;
import cn.novelstudio.module.risk.model.RiskEventType;
import cn.novelstudio.module.risk.model.RiskSessionState;
import cn.novelstudio.module.risk.store.RiskSessionStore;
import cn.novelstudio.platform.security.DeviceSessionRecord;
import cn.novelstudio.platform.security.FingerprintMatcher;
import cn.novelstudio.platform.web.clientsecurity.ClientSecurityProperties;
import cn.novelstudio.platform.web.clientsecurity.DeviceSessionSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskEvaluationService {

    private static final String CAT_AUTOMATION = "automation";
    private static final String CAT_FINGERPRINT = "fingerprint";
    private static final String CAT_GEO = "geo";
    private static final String CAT_VELOCITY = "velocity";

    private final RiskProperties properties;
    private final RiskSessionStore riskSessionStore;
    private final SessionChallengeService challengeService;
    private final DeviceSessionSupport deviceSessionSupport;
    private final ClientSecurityProperties clientSecurityProperties;

    public RiskEvaluationResult evaluate(RiskEvaluationContext ctx) {
        if (!properties.enabled() || ctx == null || ctx.sessionId() == null || ctx.sessionId().isBlank()) {
            return new RiskEvaluationResult(0, Set.of(), false, false);
        }

        long now = Instant.now().toEpochMilli();
        RiskSessionState prior = riskSessionStore.loadOrEmpty(ctx.sessionId());
        if (prior == null) {
            prior = RiskSessionState.empty();
        }
        Map<String, Integer> signalScores = new LinkedHashMap<>();
        Set<String> categories = new LinkedHashSet<>();

        scoreAutomation(ctx, signalScores, categories);
        scoreFingerprint(ctx, signalScores, categories);
        scoreGeo(ctx, prior, signalScores, categories);
        scoreRefreshBurst(ctx, prior, signalScores, categories);

        int total = signalScores.values().stream().mapToInt(Integer::intValue).sum();
        int score = Math.min(100, total);

        RiskSessionState next = buildNextState(prior, ctx, categories, score, now);
        riskSessionStore.save(ctx.sessionId(), next);
        syncDeviceRiskScore(ctx.sessionId(), score);

        boolean revoke = score >= properties.revokeThreshold();
        boolean challenge = !revoke
            && score >= properties.stepUpThreshold()
            && categories.size() >= properties.minSignalsForStepUp();

        if (challenge) {
            challengeService.markChallengeRequired(ctx.sessionId(), ctx.userId());
            log.info(
                "risk step-up sid={} userId={} score={} signals={}",
                ctx.sessionId(),
                ctx.userId(),
                score,
                categories
            );
        }

        return new RiskEvaluationResult(score, Set.copyOf(categories), challenge, revoke);
    }

    public void onLogin(RiskEvaluationContext ctx) {
        if (!properties.enabled() || ctx == null) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        String country = normalizeCountry(ctx.clientCountry());
        String ipPrefix = ipPrefix(ctx.clientIp());
        RiskSessionState seeded = RiskSessionState.empty()
            .withLoginContext(country, ipPrefix, now);
        riskSessionStore.save(ctx.sessionId(), seeded);
        evaluate(ctx.withEvent(RiskEventType.LOGIN));
    }

    public void reduceScoreAfterChallenge(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        RiskSessionState state = riskSessionStore.loadOrEmpty(sessionId);
        int reduced = Math.max(0, state.score() - properties.challengeScoreReduction());
        RiskSessionState next = new RiskSessionState(
            reduced,
            Set.of(),
            state.loginCountry(),
            state.loginIpPrefix(),
            Instant.now().toEpochMilli(),
            0,
            0L
        );
        riskSessionStore.save(sessionId, next);
        syncDeviceRiskScore(sessionId, reduced);
    }

    private void scoreAutomation(
        RiskEvaluationContext ctx,
        Map<String, Integer> scores,
        Set<String> categories
    ) {
        Map<String, Object> env = ctx.envSnapshot();
        if (env == null) {
            return;
        }
        if (Boolean.TRUE.equals(env.get("webdriver"))) {
            addSignal(scores, categories, CAT_AUTOMATION, 25);
        }
        Object headless = env.get("headless");
        if (Boolean.TRUE.equals(headless)) {
            addSignal(scores, categories, CAT_AUTOMATION, 20);
        }
    }

    private void scoreFingerprint(
        RiskEvaluationContext ctx,
        Map<String, Integer> scores,
        Set<String> categories
    ) {
        if (ctx.eventType() != RiskEventType.HEARTBEAT && ctx.eventType() != RiskEventType.REFRESH) {
            return;
        }
        Optional<DeviceSessionRecord> device = deviceSessionSupport.load(ctx.sessionId());
        if (device.isEmpty()) {
            return;
        }
        String bound = device.get().fpHash();
        String presented = ctx.presentedFingerprint() != null && !ctx.presentedFingerprint().isBlank()
            ? ctx.presentedFingerprint()
            : ctx.fingerprint();
        if (bound == null || bound.isBlank() || presented == null || presented.isBlank()) {
            return;
        }
        if (FingerprintMatcher.matches(bound, presented, clientSecurityProperties.fingerprintTolerance())) {
            return;
        }
        // 仅明显漂移才计分，避免 warn 模式误伤
        if (!FingerprintMatcher.matches(bound, presented, Math.max(0.35, clientSecurityProperties.fingerprintTolerance()))) {
            addSignal(scores, categories, CAT_FINGERPRINT, 35);
        }
    }

    private void scoreGeo(
        RiskEvaluationContext ctx,
        RiskSessionState prior,
        Map<String, Integer> scores,
        Set<String> categories
    ) {
        if (ctx.eventType() == RiskEventType.LOGIN) {
            return;
        }
        String loginCountry = prior.loginCountry();
        String current = normalizeCountry(ctx.clientCountry());
        if (loginCountry == null || current == null || loginCountry.equalsIgnoreCase(current)) {
            return;
        }
        addSignal(scores, categories, CAT_GEO, 20);
    }

    private void scoreRefreshBurst(
        RiskEvaluationContext ctx,
        RiskSessionState prior,
        Map<String, Integer> scores,
        Set<String> categories
    ) {
        if (ctx.eventType() != RiskEventType.REFRESH) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        long windowMs = properties.refreshBurstWindowSeconds() * 1000L;
        int count = 1;
        if (prior.refreshWindowStartedAt() > 0 && now - prior.refreshWindowStartedAt() <= windowMs) {
            count = prior.refreshCountInWindow() + 1;
        }
        if (count > properties.refreshBurstLimit()) {
            addSignal(scores, categories, CAT_VELOCITY, properties.refreshBurstScore());
        }
    }

    private RiskSessionState buildNextState(
        RiskSessionState prior,
        RiskEvaluationContext ctx,
        Set<String> categories,
        int score,
        long now
    ) {
        RiskSessionState base = prior;
        if (ctx.eventType() == RiskEventType.LOGIN) {
            base = prior.withLoginContext(normalizeCountry(ctx.clientCountry()), ipPrefix(ctx.clientIp()), now);
        }
        if (ctx.eventType() == RiskEventType.REFRESH) {
            long windowMs = properties.refreshBurstWindowSeconds() * 1000L;
            int count = 1;
            long windowStart = now;
            if (prior.refreshWindowStartedAt() > 0 && now - prior.refreshWindowStartedAt() <= windowMs) {
                count = prior.refreshCountInWindow() + 1;
                windowStart = prior.refreshWindowStartedAt();
            }
            base = base.withRefreshWindow(count, windowStart);
        }
        return base.withEvaluation(score, categories, now);
    }

    private void syncDeviceRiskScore(String sessionId, int score) {
        deviceSessionSupport.load(sessionId).ifPresent(record -> {
            DeviceSessionRecord updated = new DeviceSessionRecord(
                record.userId(),
                record.sessionId(),
                record.fpHash(),
                record.envSnapshot(),
                score,
                record.lastHeartbeatAt(),
                Instant.now().toEpochMilli()
            );
            deviceSessionSupport.save(sessionId, updated);
        });
    }

    private static void addSignal(
        Map<String, Integer> scores,
        Set<String> categories,
        String category,
        int points
    ) {
        categories.add(category);
        scores.merge(category, points, Integer::sum);
    }

    private static String normalizeCountry(String country) {
        if (country == null || country.isBlank() || "XX".equalsIgnoreCase(country.trim())) {
            return null;
        }
        return country.trim().toUpperCase();
    }

    private static String ipPrefix(String ip) {
        if (ip == null || ip.isBlank()) {
            return null;
        }
        int dot = ip.indexOf('.');
        return dot > 0 ? ip.substring(0, dot) : ip;
    }
}
