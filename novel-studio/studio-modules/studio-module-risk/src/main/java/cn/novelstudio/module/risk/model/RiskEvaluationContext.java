package cn.novelstudio.module.risk.model;

import java.util.Map;

/**
 * 单次风控评估上下文。
 */
public record RiskEvaluationContext(
    String sessionId,
    Long userId,
    String fingerprint,
    String presentedFingerprint,
    String clientIp,
    String clientCountry,
    Map<String, Object> envSnapshot,
    RiskEventType eventType
) {
    public RiskEvaluationContext withEvent(RiskEventType type) {
        return new RiskEvaluationContext(
            sessionId,
            userId,
            fingerprint,
            presentedFingerprint,
            clientIp,
            clientCountry,
            envSnapshot,
            type
        );
    }
}
