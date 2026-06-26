package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteContentResp;
import cn.novelstudio.module.billing.dto.SiteContentUpdateReq;
import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.entity.SiteContentId;
import cn.novelstudio.module.billing.repository.SiteContentRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.SiteContentKeys;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.platform.i18n.TranslationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SiteContentBiz extends BaseBiz {

    private static final String SOURCE_LOCALE = AppLocale.ZH_CN.tag();

    private final SiteContentRepository siteContentRepository;
    private final AuditLogService auditLogService;
    private final TranslationService translationService;
    private final I18nProperties i18nProperties;
    private final StudioMessages messages;

    public Result<SiteContentResp> getPublic(String key) {
        SiteContentEntity entity = requireContent(key, resolveRequestLocale());
        return ok(toResp(entity));
    }

    public Result<List<SiteContentResp>> listAll() {
        List<SiteContentResp> list = siteContentRepository.findAllByOrderByIdContentKeyAscIdLocaleAsc().stream()
            .map(this::toResp)
            .toList();
        return ok(list);
    }

    @Transactional
    public Result<SiteContentResp> update(String key, SiteContentUpdateReq req, Long actorId) {
        SiteContentKeys.requireAllowed(key);
        String trimmedKey = key.trim();
        SiteContentEntity entity = siteContentRepository
            .findByIdContentKeyAndIdLocale(trimmedKey, SOURCE_LOCALE)
            .orElseGet(() -> newEntity(trimmedKey, SOURCE_LOCALE));
        Map<String, String> before = Map.of(
            "title", entity.getTitle() == null ? "" : entity.getTitle(),
            "bodyMd", entity.getBodyMd() == null ? "" : entity.getBodyMd()
        );
        entity.setTitle(req.title().trim());
        entity.setBodyMd(req.bodyMd());
        entity.setUpdatedBy(actorId);
        SiteContentEntity saved = siteContentRepository.save(entity);
        syncEnglishTranslation(saved, actorId);
        auditLogService.log(
            actorId,
            "site.content.update",
            "site_content",
            trimmedKey,
            before,
            Map.of("title", saved.getTitle(), "bodyMd", saved.getBodyMd())
        );
        return ok(toResp(saved));
    }

    private void syncEnglishTranslation(SiteContentEntity source, Long actorId) {
        if (!i18nProperties.isAutoTranslateSiteContent()) {
            return;
        }
        SiteContentEntity english = siteContentRepository
            .findByIdContentKeyAndIdLocale(source.getContentKey(), AppLocale.EN.tag())
            .orElseGet(() -> newEntity(source.getContentKey(), AppLocale.EN.tag()));
        english.setTitle(translationService.translateToEnglish(source.getTitle()));
        english.setBodyMd(translationService.translateToEnglish(source.getBodyMd()));
        english.setUpdatedBy(actorId);
        siteContentRepository.save(english);
    }

    private SiteContentEntity requireContent(String key, String locale) {
        SiteContentKeys.requireAllowed(key);
        return siteContentRepository.findByIdContentKeyAndIdLocale(key.trim(), locale)
            .orElseGet(() -> siteContentRepository.findByIdContentKeyAndIdLocale(key.trim(), SOURCE_LOCALE)
                .orElseThrow(() -> NotFoundException.keyed(
                    ResultCode.NOT_FOUND,
                    "result.content.key_not_found",
                    key
                )));
    }

    private static String resolveRequestLocale() {
        return LocaleContext.get().tag();
    }

    private static SiteContentEntity newEntity(String contentKey, String locale) {
        SiteContentEntity created = new SiteContentEntity();
        created.setId(new SiteContentId(contentKey, locale));
        return created;
    }

    private SiteContentResp toResp(SiteContentEntity entity) {
        return new SiteContentResp(
            entity.getContentKey(),
            entity.getTitle(),
            entity.getBodyMd(),
            entity.getLocale(),
            entity.getUpdatedAt()
        );
    }
}
