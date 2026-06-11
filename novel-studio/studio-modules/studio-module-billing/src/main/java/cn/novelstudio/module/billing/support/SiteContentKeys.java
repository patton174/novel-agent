package cn.novelstudio.module.billing.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;

import java.util.Set;

public final class SiteContentKeys {

    public static final Set<String> ALLOWED = Set.of("privacy", "terms", "contact", "announcement");

    private SiteContentKeys() {}

    public static void requireAllowed(String key) {
        if (key == null || !ALLOWED.contains(key.trim())) {
            throw BizException.of(ResultCode.BAD_REQUEST, "不支持的内容 key: " + key);
        }
    }
}
