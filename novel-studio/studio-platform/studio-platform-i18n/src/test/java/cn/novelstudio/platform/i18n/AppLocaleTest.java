package cn.novelstudio.platform.i18n;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AppLocaleTest {

    @Test
    void parsesExplicitLocaleHeader() {
        assertEquals(AppLocale.EN, AppLocale.fromTag("en"));
        assertEquals(AppLocale.EN, AppLocale.fromTag("en-US"));
        assertEquals(AppLocale.ZH_CN, AppLocale.fromTag("zh-CN"));
    }

    @Test
    void parsesAcceptLanguage() {
        assertEquals(AppLocale.EN, AppLocale.fromAcceptLanguage("en-US,en;q=0.9,zh-CN;q=0.8"));
        assertEquals(AppLocale.ZH_CN, AppLocale.fromAcceptLanguage("zh-CN,zh;q=0.9"));
    }
}
