package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.entity.SiteContentId;
import cn.novelstudio.module.billing.repository.SiteContentRepository;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.TranslationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteContentTranslationServiceTest {

    private SiteContentRepository repository;
    private TranslationService translationService;
    private I18nProperties i18nProperties;
    private SiteContentTranslationService service;

    @BeforeEach
    void setUp() {
        repository = mock(SiteContentRepository.class);
        translationService = mock(TranslationService.class);
        i18nProperties = new I18nProperties();
        i18nProperties.setAutoTranslateSiteContent(true);
        i18nProperties.setTranslationBaseUrl("https://translate.example");
        i18nProperties.setSiteContentSyncBatchSize(20);
        service = new SiteContentTranslationService(repository, translationService, i18nProperties);
    }

    @Test
    void skipsWhenAutoTranslateDisabled() {
        i18nProperties.setAutoTranslateSiteContent(false);

        int synced = service.syncPending();

        assertThat(synced).isZero();
        verify(repository, never()).findAllByIdLocaleOrderByUpdatedAtAsc(any());
    }

    @Test
    void skipsWhenTranslationNotConfigured() {
        i18nProperties.setTranslationBaseUrl("");

        int synced = service.syncPending();

        assertThat(synced).isZero();
        verify(repository, never()).findAllByIdLocaleOrderByUpdatedAtAsc(any());
    }

    @Test
    void syncsMissingEnglishRow() {
        SiteContentEntity zh = zhRow("about", "关于", "正文", Instant.parse("2026-01-01T00:00:00Z"));
        when(repository.findAllByIdLocaleOrderByUpdatedAtAsc(AppLocale.ZH_CN.tag())).thenReturn(List.of(zh));
        when(repository.findByIdContentKeyAndIdLocale("about", AppLocale.EN.tag())).thenReturn(Optional.empty());
        when(translationService.translateToEnglish("关于")).thenReturn("About");
        when(translationService.translateToEnglish("正文")).thenReturn("Body");
        when(repository.save(any(SiteContentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        int synced = service.syncPending();

        assertThat(synced).isEqualTo(1);
        verify(translationService).translateToEnglish("关于");
        verify(translationService).translateToEnglish("正文");
        verify(repository).save(any(SiteContentEntity.class));
    }

    @Test
    void syncsWhenEnglishIsStale() {
        SiteContentEntity zh = zhRow("about", "关于", "正文", Instant.parse("2026-06-01T00:00:00Z"));
        SiteContentEntity en = enRow("about", "Old", "Old body", Instant.parse("2026-01-01T00:00:00Z"));
        when(repository.findAllByIdLocaleOrderByUpdatedAtAsc(AppLocale.ZH_CN.tag())).thenReturn(List.of(zh));
        when(repository.findByIdContentKeyAndIdLocale("about", AppLocale.EN.tag())).thenReturn(Optional.of(en));
        when(translationService.translateToEnglish("关于")).thenReturn("About");
        when(translationService.translateToEnglish("正文")).thenReturn("Body");
        when(repository.save(any(SiteContentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        int synced = service.syncPending();

        assertThat(synced).isEqualTo(1);
        verify(repository).save(en);
        assertThat(en.getTitle()).isEqualTo("About");
        assertThat(en.getBodyMd()).isEqualTo("Body");
    }

    @Test
    void syncsWhenEnglishTitleOrBodyEmpty() {
        SiteContentEntity zh = zhRow("about", "关于", "正文", Instant.parse("2026-01-01T00:00:00Z"));
        SiteContentEntity en = enRow("about", "", "Body", Instant.parse("2026-06-01T00:00:00Z"));
        when(repository.findAllByIdLocaleOrderByUpdatedAtAsc(AppLocale.ZH_CN.tag())).thenReturn(List.of(zh));
        when(repository.findByIdContentKeyAndIdLocale("about", AppLocale.EN.tag())).thenReturn(Optional.of(en));
        when(translationService.translateToEnglish("关于")).thenReturn("About");
        when(translationService.translateToEnglish("正文")).thenReturn("Body");
        when(repository.save(any(SiteContentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        int synced = service.syncPending();

        assertThat(synced).isEqualTo(1);
        verify(repository).save(en);
    }

    @Test
    void skipsWhenEnglishIsUpToDate() {
        Instant updatedAt = Instant.parse("2026-06-01T00:00:00Z");
        SiteContentEntity zh = zhRow("about", "关于", "正文", updatedAt);
        SiteContentEntity en = enRow("about", "About", "Body", updatedAt);
        when(repository.findAllByIdLocaleOrderByUpdatedAtAsc(AppLocale.ZH_CN.tag())).thenReturn(List.of(zh));
        when(repository.findByIdContentKeyAndIdLocale("about", AppLocale.EN.tag())).thenReturn(Optional.of(en));

        int synced = service.syncPending();

        assertThat(synced).isZero();
        verify(translationService, never()).translateToEnglish(any());
        verify(repository, never()).save(any());
    }

    @Test
    void respectsBatchLimit() {
        i18nProperties.setSiteContentSyncBatchSize(1);
        SiteContentEntity zh1 = zhRow("a", "标题1", "正文1", Instant.parse("2026-01-01T00:00:00Z"));
        SiteContentEntity zh2 = zhRow("b", "标题2", "正文2", Instant.parse("2026-01-02T00:00:00Z"));
        when(repository.findAllByIdLocaleOrderByUpdatedAtAsc(AppLocale.ZH_CN.tag())).thenReturn(List.of(zh1, zh2));
        when(repository.findByIdContentKeyAndIdLocale(any(), any())).thenReturn(Optional.empty());
        when(translationService.translateToEnglish(any())).thenAnswer(inv -> "en-" + inv.getArgument(0));
        when(repository.save(any(SiteContentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        int synced = service.syncPending();

        assertThat(synced).isEqualTo(1);
        verify(repository, times(1)).save(any(SiteContentEntity.class));
    }

    private static SiteContentEntity zhRow(String key, String title, String body, Instant updatedAt) {
        SiteContentEntity entity = new SiteContentEntity();
        entity.setId(new SiteContentId(key, AppLocale.ZH_CN.tag()));
        entity.setTitle(title);
        entity.setBodyMd(body);
        entity.setUpdatedAt(updatedAt);
        return entity;
    }

    private static SiteContentEntity enRow(String key, String title, String body, Instant updatedAt) {
        SiteContentEntity entity = new SiteContentEntity();
        entity.setId(new SiteContentId(key, AppLocale.EN.tag()));
        entity.setTitle(title);
        entity.setBodyMd(body);
        entity.setUpdatedAt(updatedAt);
        return entity;
    }
}
