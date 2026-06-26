package cn.novelstudio.platform.i18n;

import java.util.Locale;

/** 请求级 Locale 上下文（Filter 写入，业务层读取）。 */
public final class LocaleContext {

    private static final ThreadLocal<AppLocale> CURRENT = new ThreadLocal<>();

    private LocaleContext() {
    }

    public static void set(AppLocale locale) {
        if (locale == null) {
            CURRENT.remove();
        } else {
            CURRENT.set(locale);
        }
    }

    public static AppLocale get() {
        AppLocale locale = CURRENT.get();
        return locale == null ? AppLocale.DEFAULT : locale;
    }

    public static Locale javaLocale() {
        return get().locale();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
