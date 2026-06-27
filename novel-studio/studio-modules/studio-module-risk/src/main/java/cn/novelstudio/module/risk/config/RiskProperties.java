package cn.novelstudio.module.risk.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.risk")
public class RiskProperties {

    /** 总开关；本地默认 false，生产可开 */
    private boolean enabled = false;
    /** 触发 Turnstile step-up 的分数（保守默认 80） */
    private int stepUpThreshold = 80;
    /** 吊销会话的分数 */
    private int revokeThreshold = 95;
    /** step-up 至少需要的独立信号类别数 */
    private int minSignalsForStepUp = 2;
    /** 挑战通过后降分 */
    private int challengeScoreReduction = 35;
    /** 挑战 pending TTL（秒） */
    private long challengeTtlSeconds = 900;
    /** 风控快照 TTL（秒，对齐 absolute session） */
    private long stateTtlSeconds = 2_592_000;
    /** 5 分钟内 refresh 次数超过此值加分 */
    private int refreshBurstLimit = 12;
    private int refreshBurstWindowSeconds = 300;
    private int refreshBurstScore = 15;

    public boolean enabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int stepUpThreshold() {
        return stepUpThreshold;
    }

    public void setStepUpThreshold(int stepUpThreshold) {
        this.stepUpThreshold = stepUpThreshold;
    }

    public int revokeThreshold() {
        return revokeThreshold;
    }

    public void setRevokeThreshold(int revokeThreshold) {
        this.revokeThreshold = revokeThreshold;
    }

    public int minSignalsForStepUp() {
        return minSignalsForStepUp;
    }

    public void setMinSignalsForStepUp(int minSignalsForStepUp) {
        this.minSignalsForStepUp = minSignalsForStepUp;
    }

    public int challengeScoreReduction() {
        return challengeScoreReduction;
    }

    public void setChallengeScoreReduction(int challengeScoreReduction) {
        this.challengeScoreReduction = challengeScoreReduction;
    }

    public long challengeTtlSeconds() {
        return challengeTtlSeconds;
    }

    public void setChallengeTtlSeconds(long challengeTtlSeconds) {
        this.challengeTtlSeconds = challengeTtlSeconds;
    }

    public long stateTtlSeconds() {
        return stateTtlSeconds;
    }

    public void setStateTtlSeconds(long stateTtlSeconds) {
        this.stateTtlSeconds = stateTtlSeconds;
    }

    public int refreshBurstLimit() {
        return refreshBurstLimit;
    }

    public void setRefreshBurstLimit(int refreshBurstLimit) {
        this.refreshBurstLimit = refreshBurstLimit;
    }

    public int refreshBurstWindowSeconds() {
        return refreshBurstWindowSeconds;
    }

    public void setRefreshBurstWindowSeconds(int refreshBurstWindowSeconds) {
        this.refreshBurstWindowSeconds = refreshBurstWindowSeconds;
    }

    public int refreshBurstScore() {
        return refreshBurstScore;
    }

    public void setRefreshBurstScore(int refreshBurstScore) {
        this.refreshBurstScore = refreshBurstScore;
    }
}
