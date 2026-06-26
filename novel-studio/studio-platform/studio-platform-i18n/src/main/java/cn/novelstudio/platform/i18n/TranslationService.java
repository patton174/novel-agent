package cn.novelstudio.platform.i18n;

/** 机器翻译（站点 CMS 等 UGC 内容）。 */
public interface TranslationService {

    /**
     * 将文本从 source 翻译到 target。
     *
     * @param text   原文
     * @param source 源 locale tag（如 zh-CN）
     * @param target 目标 locale tag（如 en）
     */
    String translate(String text, AppLocale source, AppLocale target);

    default String translateToEnglish(String text) {
        return translate(text, AppLocale.ZH_CN, AppLocale.EN);
    }
}
