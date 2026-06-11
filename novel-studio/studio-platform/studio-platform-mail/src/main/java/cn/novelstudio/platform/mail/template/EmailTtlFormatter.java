package cn.novelstudio.platform.mail.template;

import cn.novelstudio.platform.mail.config.EmailBrandProperties;

import java.util.HashMap;
import java.util.Map;

public final class EmailTtlFormatter {

    private EmailTtlFormatter() {
    }

    public static String formatLabel(long ttlSeconds) {
        if (ttlSeconds <= 0) {
            return "有限时间";
        }
        if (ttlSeconds % 86_400 == 0) {
            return (ttlSeconds / 86_400) + " 天";
        }
        if (ttlSeconds % 3_600 == 0) {
            return (ttlSeconds / 3_600) + " 小时";
        }
        if (ttlSeconds % 60 == 0) {
            return (ttlSeconds / 60) + " 分钟";
        }
        return ttlSeconds + " 秒";
    }
}
