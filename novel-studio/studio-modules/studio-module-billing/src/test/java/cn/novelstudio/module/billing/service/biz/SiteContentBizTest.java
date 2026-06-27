package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteContentResp;
import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.entity.SiteContentId;
import cn.novelstudio.module.billing.repository.SiteContentRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.platform.i18n.TranslationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SiteContentBizTest {

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    @Test
    void getPublic_enRequestWithoutEnRow_fallsBackToZhWithFlag() {
        SiteContentRepository repo = mock(SiteContentRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        TranslationService translationService = mock(TranslationService.class);
        I18nProperties i18nProperties = mock(I18nProperties.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.get(anyString())).thenAnswer(inv -> inv.getArgument(0));

        Instant updatedAt = Instant.parse("2026-01-01T00:00:00Z");
        SiteContentEntity zh = content("privacy", AppLocale.ZH_CN.tag(), "隐私政策", "中文正文", updatedAt);

        when(repo.findByIdContentKeyAndIdLocale("privacy", AppLocale.EN.tag())).thenReturn(Optional.empty());
        when(repo.findByIdContentKeyAndIdLocale("privacy", AppLocale.ZH_CN.tag())).thenReturn(Optional.of(zh));

        LocaleContext.set(AppLocale.EN);
        SiteContentBiz biz = new SiteContentBiz(
            repo,
            auditLogService,
            translationService,
            i18nProperties,
            messages
        );

        SiteContentResp resp = biz.getPublic("privacy").data();

        assertThat(resp.title()).isEqualTo("隐私政策");
        assertThat(resp.bodyMd()).isEqualTo("中文正文");
        assertThat(resp.locale()).isEqualTo(AppLocale.ZH_CN.tag());
        assertThat(resp.requestedLocale()).isEqualTo(AppLocale.EN.tag());
        assertThat(resp.resolvedLocale()).isEqualTo(AppLocale.ZH_CN.tag());
        assertThat(resp.localeResolved()).isTrue();
    }

    @Test
    void getPublic_enRequestWithFreshEnglishRow_servesEnglishWithoutFallback() {
        SiteContentRepository repo = mock(SiteContentRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        TranslationService translationService = mock(TranslationService.class);
        I18nProperties i18nProperties = mock(I18nProperties.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.get(anyString())).thenAnswer(inv -> inv.getArgument(0));

        Instant updatedAt = Instant.parse("2026-06-01T00:00:00Z");
        SiteContentEntity zh = content("privacy", AppLocale.ZH_CN.tag(), "隐私政策", "中文正文", updatedAt);
        SiteContentEntity en = content("privacy", AppLocale.EN.tag(), "Privacy", "English body", updatedAt);

        when(repo.findByIdContentKeyAndIdLocale("privacy", AppLocale.EN.tag())).thenReturn(Optional.of(en));
        when(repo.findByIdContentKeyAndIdLocale("privacy", AppLocale.ZH_CN.tag())).thenReturn(Optional.of(zh));

        LocaleContext.set(AppLocale.EN);
        SiteContentBiz biz = new SiteContentBiz(
            repo,
            auditLogService,
            translationService,
            i18nProperties,
            messages
        );

        SiteContentResp resp = biz.getPublic("privacy").data();

        assertThat(resp.title()).isEqualTo("Privacy");
        assertThat(resp.localeResolved()).isFalse();
    }

    @Test
    void getPublic_missingKey_returnsEmptyBodyInsteadOf404() {
        SiteContentRepository repo = mock(SiteContentRepository.class);
        when(repo.findByIdContentKeyAndIdLocale("announcement", AppLocale.EN.tag())).thenReturn(Optional.empty());
        when(repo.findByIdContentKeyAndIdLocale("announcement", AppLocale.ZH_CN.tag())).thenReturn(Optional.empty());

        LocaleContext.set(AppLocale.ZH_CN);
        SiteContentBiz biz = new SiteContentBiz(
            repo,
            mock(AuditLogService.class),
            mock(TranslationService.class),
            mock(I18nProperties.class),
            mock(StudioMessages.class)
        );

        SiteContentResp resp = biz.getPublic("announcement").data();
        assertThat(resp.contentKey()).isEqualTo("announcement");
        assertThat(resp.bodyMd()).isEmpty();
    }

    private static SiteContentEntity content(
        String key,
        String locale,
        String title,
        String bodyMd,
        Instant updatedAt
    ) {
        SiteContentEntity entity = new SiteContentEntity();
        entity.setId(new SiteContentId(key, locale));
        entity.setTitle(title);
        entity.setBodyMd(bodyMd);
        entity.setUpdatedAt(updatedAt);
        return entity;
    }
}
