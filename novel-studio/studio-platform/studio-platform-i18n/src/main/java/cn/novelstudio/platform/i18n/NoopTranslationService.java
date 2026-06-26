package cn.novelstudio.platform.i18n;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** 未配置翻译 API 时的降级：同语言返回原文，跨语言返回原文并打 warn。 */
public class NoopTranslationService implements TranslationService {

    private static final Logger log = LoggerFactory.getLogger(NoopTranslationService.class);

    @Override
    public String translate(String text, AppLocale source, AppLocale target) {
        if (text == null || text.isBlank() || source == target) {
            return text;
        }
        log.debug("Translation API not configured; returning source text ({} -> {})", source.tag(), target.tag());
        return text;
    }
}
