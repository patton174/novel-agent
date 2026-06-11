package cn.novelstudio.module.billing.support;

public final class BillingRedisKeys {

    public static final String USAGE_TOKENS_PREFIX = "billing:usage:";
    public static final String USAGE_RUNS_SUFFIX = ":runs";
    public static final String PLAN_SNAPSHOT_PREFIX = "billing:plan:";

    private BillingRedisKeys() {
    }

    public static String usageTokensKey(long userId, String periodYyyyMm) {
        return USAGE_TOKENS_PREFIX + userId + ":" + periodYyyyMm + ":tokens";
    }

    public static String usageRunsKey(long userId, String periodYyyyMm) {
        return USAGE_TOKENS_PREFIX + userId + ":" + periodYyyyMm + USAGE_RUNS_SUFFIX;
    }

    public static String planSnapshotKey(long userId) {
        return PLAN_SNAPSHOT_PREFIX + userId;
    }
}
