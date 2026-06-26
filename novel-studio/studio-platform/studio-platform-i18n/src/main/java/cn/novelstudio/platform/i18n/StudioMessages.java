package cn.novelstudio.platform.i18n;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class StudioMessages {

    private final MessageSource messageSource;

    public StudioMessages(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public String get(String key, Object... args) {
        return get(key, LocaleContext.javaLocale(), args);
    }

    public String get(String key, Locale locale, Object... args) {
        return messageSource.getMessage(key, args, key, locale);
    }

    public String getOrDefault(String key, String fallback, Object... args) {
        String resolved = get(key, args);
        return key.equals(resolved) ? fallback : resolved;
    }

    /** 供非 Web 线程（如 @Async）临时绑定 Locale 时使用。 */
    public static void bind(AppLocale locale) {
        LocaleContextHolder.setLocale(locale.locale());
        LocaleContext.set(locale);
    }

    public static void unbind() {
        LocaleContextHolder.resetLocaleContext();
        LocaleContext.clear();
    }
}
