package cn.novelstudio.module.risk.model;

import java.util.Set;

public record RiskEvaluationResult(
    int score,
    Set<String> signalCategories,
    boolean challengeRequired,
    boolean revokeRecommended
) {
}
