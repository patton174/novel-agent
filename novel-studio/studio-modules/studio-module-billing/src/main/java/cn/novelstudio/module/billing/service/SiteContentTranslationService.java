package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.entity.SiteContentId;
import cn.novelstudio.module.billing.repository.SiteContentRepository;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.TranslationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SiteContentTranslationService {

    private static final String SOURCE_LOCALE = AppLocale.ZH_CN.tag();
    private static final String TARGET_LOCALE = AppLocale.EN.tag();

    private final SiteContentRepository siteContentRepository;
    private final TranslationService translationService;
    private final I18nProperties i18nProperties;

    @Transactional
    public int syncPending() {
        if (!i18nProperties.isAutoTranslateSiteContent() || !i18nProperties.isTranslationConfigured()) {
            return 0;
        }

        int batchLimit = Math.max(1, i18nProperties.getSiteContentSyncBatchSize());
        List<SiteContentEntity> sources = siteContentRepository.findAllByIdLocaleOrderByUpdatedAtAsc(SOURCE_LOCALE);
        int synced = 0;
        for (SiteContentEntity source : sources) {
            if (synced >= batchLimit) {
                break;
            }
            if (!needsSync(source)) {
                continue;
            }
            syncEnglishTranslation(source);
            synced++;
        }

        if (synced > 0) {
            log.info("site content translation: synced {} row(s)", synced);
        }
        return synced;
    }

    private boolean needsSync(SiteContentEntity source) {
        Optional<SiteContentEntity> english = siteContentRepository
            .findByIdContentKeyAndIdLocale(source.getContentKey(), TARGET_LOCALE);
        if (english.isEmpty()) {
            return true;
        }
        SiteContentEntity en = english.get();
        if (isBlank(en.getTitle()) || isBlank(en.getBodyMd())) {
            return true;
        }
        if (source.getUpdatedAt() == null) {
            return false;
        }
        if (en.getUpdatedAt() == null) {
            return true;
        }
        return en.getUpdatedAt().isBefore(source.getUpdatedAt());
    }

    private void syncEnglishTranslation(SiteContentEntity source) {
        SiteContentEntity english = siteContentRepository
            .findByIdContentKeyAndIdLocale(source.getContentKey(), TARGET_LOCALE)
            .orElseGet(() -> newEntity(source.getContentKey(), TARGET_LOCALE));
        english.setTitle(translationService.translateToEnglish(source.getTitle()));
        english.setBodyMd(translationService.translateToEnglish(source.getBodyMd()));
        english.setUpdatedBy(null);
        siteContentRepository.save(english);
    }

    private static SiteContentEntity newEntity(String contentKey, String locale) {
        SiteContentEntity created = new SiteContentEntity();
        created.setId(new SiteContentId(contentKey, locale));
        return created;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
