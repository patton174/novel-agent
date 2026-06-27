package cn.novelstudio.module.risk.service;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.module.risk.model.RiskEvaluationContext;
import cn.novelstudio.module.risk.model.RiskEvaluationResult;
import cn.novelstudio.module.risk.model.RiskEventType;
import cn.novelstudio.module.risk.store.RiskSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * Auth 模块调用的风控入口；disabled 时零开销短路。
 */
@Service
@RequiredArgsConstructor
public class RiskSessionHooks {

    private final RiskProperties properties;
    private final RiskEvaluationService evaluationService;
    private final SessionChallengeService challengeService;
    private final RiskSessionStore riskSessionStore;

    public void onLogin(
        String sessionId,
        Long userId,
        String fingerprint,
        String clientIp,
        String clientCountry,
        Map<String, Object> envSnapshot
    ) {
        if (!properties.enabled()) {
            return;
        }
        evaluationService.onLogin(new RiskEvaluationContext(
            sessionId,
            userId,
            fingerprint,
            fingerprint,
            clientIp,
            clientCountry,
            envSnapshot,
            RiskEventType.LOGIN
        ));
    }

    public RiskEvaluationResult onRefresh(
        String sessionId,
        Long userId,
        String fingerprint,
        String clientIp,
        String clientCountry,
        Map<String, Object> envSnapshot
    ) {
        if (!properties.enabled()) {
            return new RiskEvaluationResult(0, Set.of(), false, false);
        }
        return evaluate(sessionId, userId, fingerprint, fingerprint, clientIp, clientCountry, envSnapshot, RiskEventType.REFRESH);
    }

    public RiskEvaluationResult onHeartbeat(
        String sessionId,
        Long userId,
        String fingerprint,
        String clientIp,
        String clientCountry,
        Map<String, Object> envDelta
    ) {
        if (!properties.enabled()) {
            return new RiskEvaluationResult(0, Set.of(), false, false);
        }
        return evaluate(sessionId, userId, fingerprint, fingerprint, clientIp, clientCountry, envDelta, RiskEventType.HEARTBEAT);
    }

    public void afterChallengeVerified(String sessionId) {
        if (!properties.enabled()) {
            return;
        }
        challengeService.clearChallenge(sessionId);
        evaluationService.reduceScoreAfterChallenge(sessionId);
    }

    public boolean isChallengePending(String sessionId) {
        return properties.enabled() && challengeService.isChallengePending(sessionId);
    }

    private RiskEvaluationResult evaluate(
        String sessionId,
        Long userId,
        String fingerprint,
        String presentedFingerprint,
        String clientIp,
        String clientCountry,
        Map<String, Object> envSnapshot,
        RiskEventType eventType
    ) {
        RiskEvaluationResult result = evaluationService.evaluate(new RiskEvaluationContext(
            sessionId,
            userId,
            fingerprint,
            presentedFingerprint,
            clientIp,
            clientCountry,
            envSnapshot,
            eventType
        ));
        if (result.revokeRecommended()) {
            riskSessionStore.delete(sessionId);
            challengeService.clearChallenge(sessionId);
        }
        return result;
    }

    public static String clientCountry(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String cf = request.getHeader("CF-IPCountry");
        if (cf != null && !cf.isBlank()) {
            return cf.trim();
        }
        return request.getHeader("X-Country-Code");
    }
}
