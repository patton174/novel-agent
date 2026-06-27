package cn.novelstudio.platform.i18n;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ResultLocalizerTest {

    private ResultLocalizer localizer;

    @BeforeEach
    void setUp() {
        ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
        source.setBasenames("classpath:i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        StudioMessages messages = new StudioMessages(source);
        I18nProperties properties = new I18nProperties();
        properties.setEnabled(true);
        localizer = new ResultLocalizer(messages, properties);
    }

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    @Test
    void localizesKnownErrorCodeToEnglish() {
        LocaleContext.set(AppLocale.EN);
        Result<Void> localized = localizer.localize(Result.fail(ResultCode.UNAUTHORIZED));
        assertEquals("Not signed in or session expired", localized.msg());
    }

    @Test
    void keepsCustomMessageWhenNotDefault() {
        LocaleContext.set(AppLocale.EN);
        Result<Void> localized = localizer.localize(Result.fail(ResultCode.BAD_REQUEST.getCode(), "自定义错误"));
        assertEquals("自定义错误", localized.msg());
    }

    @Test
    void resolvesBraceWrappedValidationKey() {
        LocaleContext.set(AppLocale.EN);
        assertEquals(
            "Title is required",
            localizer.resolveValidationFieldMessage("{validation.content.title_required}")
        );
    }

    @Test
    void resolvesMessageKeyLiteralInChinese() {
        LocaleContext.set(AppLocale.ZH_CN);
        assertEquals("缺少请求签名", localizer.resolveLiteral("security.client.sign_required"));
        assertEquals("内部密钥无效", localizer.resolveLiteral("result.internal.key_invalid"));
    }

    @Test
    void localizesKeyedBizException() {
        LocaleContext.set(AppLocale.EN);
        String msg = localizer.resolveException(
            ValidationException.keyed(ResultCode.CAPTCHA_INVALID, "validation.captcha.turnstile_required")
        );
        assertEquals("Please complete human verification", msg);
    }
}
