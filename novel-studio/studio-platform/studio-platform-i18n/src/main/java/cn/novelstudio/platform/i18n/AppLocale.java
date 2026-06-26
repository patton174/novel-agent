package cn.novelstudio.platform.i18n;

import java.util.Locale;

/** 应用支持的 Locale（与前端 i18next zh/en 对齐）。 */
public enum AppLocale {
    ZH_CN("zh-CN", Locale.SIMPLIFIED_CHINESE),
    EN("en", Locale.ENGLISH);

    public static final AppLocale DEFAULT = ZH_CN;

    private final String tag;
    private final Locale locale;

    AppLocale(String tag, Locale locale) {
        this.tag = tag;
        this.locale = locale;
    }

    public String tag() {
        return tag;
    }

    public Locale locale() {
        return locale;
    }

    public static AppLocale fromTag(String raw) {
        if (raw == null || raw.isBlank()) {
            return DEFAULT;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        if (normalized.startsWith("en")) {
            return EN;
        }
        if (normalized.startsWith("zh")) {
            return ZH_CN;
        }
        return DEFAULT;
    }

    public static AppLocale fromAcceptLanguage(String header) {
        if (header == null || header.isBlank()) {
            return DEFAULT;
        }
        String[] parts = header.split(",");
        for (String part : parts) {
            String tag = part.split(";")[0].trim();
            if (!tag.isBlank()) {
                AppLocale locale = fromTag(tag);
                if (locale != DEFAULT || tag.toLowerCase(Locale.ROOT).startsWith("zh")) {
                    return locale;
                }
            }
        }
        return DEFAULT;
    }
}
