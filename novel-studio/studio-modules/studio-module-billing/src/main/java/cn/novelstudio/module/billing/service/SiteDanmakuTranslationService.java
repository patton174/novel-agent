package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.TranslationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SiteDanmakuTranslationService {

    private final SiteDanmakuRepository siteDanmakuRepository;
    private final TranslationService translationService;
    private final I18nProperties i18nProperties;

    @Transactional
    public int syncPending() {
        if (!i18nProperties.isAutoTranslateSiteContent() || !i18nProperties.isTranslationConfigured()) {
            return 0;
        }

        int batchLimit = Math.max(1, i18nProperties.getSiteContentSyncBatchSize());
        List<SiteDanmakuEntity> pending = siteDanmakuRepository.findPendingEnglishTranslation(
            PageRequest.of(0, batchLimit)
        );
        int synced = 0;
        for (SiteDanmakuEntity row : pending) {
            syncEnglishTranslation(row);
            synced++;
        }

        if (synced > 0) {
            log.info("site danmaku translation: synced {} row(s)", synced);
        }
        return synced;
    }

    private void syncEnglishTranslation(SiteDanmakuEntity source) {
        source.setMessageEn(translationService.translateToEnglish(source.getMessage()));
        source.setMessageEnUpdatedAt(Instant.now());
        siteDanmakuRepository.save(source);
    }
}
