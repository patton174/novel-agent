package cn.novelstudio.module.billing.support;

import java.util.Map;
import java.util.Set;

public final class GiftCampaignSupport {

    public static final String TYPE_QUOTA_BONUS = "quota_bonus";
    public static final String TYPE_PLAN_TRIAL = "plan_trial";
    public static final String TYPE_LICENSE_KEY = "license_key";

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_DISABLED = "disabled";

    public static final String REDEMPTION_AVAILABLE = "available";
    public static final String REDEMPTION_REDEEMED = "redeemed";
    public static final String REDEMPTION_REVOKED = "revoked";

    public static final Set<String> GIFT_TYPES = Set.of(
        TYPE_QUOTA_BONUS,
        TYPE_PLAN_TRIAL,
        TYPE_LICENSE_KEY
    );

    private GiftCampaignSupport() {
    }

    public static long longFromConfig(Map<String, Object> config, String key, long defaultValue) {
        if (config == null || !config.containsKey(key)) {
            return defaultValue;
        }
        Object raw = config.get(key);
        if (raw instanceof Number number) {
            return number.longValue();
        }
        if (raw instanceof String text && !text.isBlank()) {
            return Long.parseLong(text.trim());
        }
        return defaultValue;
    }

    public static int intFromConfig(Map<String, Object> config, String key, int defaultValue) {
        if (config == null || !config.containsKey(key)) {
            return defaultValue;
        }
        Object raw = config.get(key);
        if (raw instanceof Number number) {
            return number.intValue();
        }
        if (raw instanceof String text && !text.isBlank()) {
            return Integer.parseInt(text.trim());
        }
        return defaultValue;
    }

    public static String stringFromConfig(Map<String, Object> config, String key) {
        if (config == null || !config.containsKey(key)) {
            return null;
        }
        Object raw = config.get(key);
        if (raw == null) {
            return null;
        }
        String text = raw.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
