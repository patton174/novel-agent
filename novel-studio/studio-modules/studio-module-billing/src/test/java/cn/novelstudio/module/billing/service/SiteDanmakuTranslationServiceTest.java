package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.TranslationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteDanmakuTranslationServiceTest {

    private SiteDanmakuRepository repository;
    private TranslationService translationService;
    private I18nProperties i18nProperties;
    private SiteDanmakuTranslationService service;

    @BeforeEach
    void setUp() {
        repository = mock(SiteDanmakuRepository.class);
        translationService = mock(TranslationService.class);
        i18nProperties = new I18nProperties();
        i18nProperties.setAutoTranslateSiteContent(true);
        i18nProperties.setTranslationBaseUrl("http://translate.test");
        i18nProperties.setSiteContentSyncBatchSize(10);
        service = new SiteDanmakuTranslationService(repository, translationService, i18nProperties);
    }

    @Test
    void syncPending_disabled_returnsZero() {
        i18nProperties.setAutoTranslateSiteContent(false);
        assertThat(service.syncPending()).isZero();
        verify(repository, never()).findPendingEnglishTranslation(any(Pageable.class));
    }

    @Test
    void syncPending_translatesRowsWithoutEnglish() {
        SiteDanmakuEntity row = new SiteDanmakuEntity();
        row.setId(1L);
        row.setMessage("很好用");
        row.setAuthorName("墨染青衫");

        when(repository.findPendingEnglishTranslation(any(Pageable.class))).thenReturn(List.of(row));
        when(translationService.translateToEnglish("很好用")).thenReturn("Works great");
        when(repository.save(any(SiteDanmakuEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.syncPending()).isEqualTo(1);
        assertThat(row.getMessageEn()).isEqualTo("Works great");
        assertThat(row.getMessageEnUpdatedAt()).isNotNull();
    }
}
