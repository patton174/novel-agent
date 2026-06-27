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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
        String requestedLocale = resolveRequestLocale();
        try {
            ResolvedSiteContent resolved = resolveContent(key, requestedLocale);
            return ok(toResp(resolved));
        } catch (NotFoundException ex) {
            return ok(emptyPublicContent(key, requestedLocale));
        }
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

    void syncEnglishTranslation(SiteContentEntity source, Long actorId) {
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

    private ResolvedSiteContent resolveContent(String key, String requestedLocale) {
        SiteContentKeys.requireAllowed(key);
        String trimmedKey = key.trim();

        if (!AppLocale.EN.tag().equals(requestedLocale)) {
            SiteContentEntity entity = siteContentRepository.findByIdContentKeyAndIdLocale(trimmedKey, requestedLocale)
                .orElseGet(() -> siteContentRepository.findByIdContentKeyAndIdLocale(trimmedKey, SOURCE_LOCALE)
                    .orElseThrow(() -> contentNotFound(key)));
            String resolvedLocale = entity.getLocale();
            return new ResolvedSiteContent(
                entity,
                requestedLocale,
                resolvedLocale,
                !requestedLocale.equals(resolvedLocale)
            );
        }

        Optional<SiteContentEntity> english = siteContentRepository
            .findByIdContentKeyAndIdLocale(trimmedKey, AppLocale.EN.tag());
        Optional<SiteContentEntity> chinese = siteContentRepository
            .findByIdContentKeyAndIdLocale(trimmedKey, SOURCE_LOCALE);

        if (english.isPresent() && isEnglishUsable(english.get(), chinese.orElse(null))) {
            return new ResolvedSiteContent(english.get(), requestedLocale, AppLocale.EN.tag(), false);
        }

        SiteContentEntity fallback = chinese.orElseThrow(() -> contentNotFound(key));
        return new ResolvedSiteContent(fallback, requestedLocale, SOURCE_LOCALE, true);
    }

    private static boolean isEnglishUsable(SiteContentEntity english, SiteContentEntity chinese) {
        if (chinese == null) {
            return true;
        }
        Instant englishUpdatedAt = english.getUpdatedAt();
        Instant chineseUpdatedAt = chinese.getUpdatedAt();
        if (chineseUpdatedAt == null) {
            return true;
        }
        if (englishUpdatedAt == null) {
            return false;
        }
        return !englishUpdatedAt.isBefore(chineseUpdatedAt);
    }

    private static NotFoundException contentNotFound(String key) {
        return NotFoundException.keyed(
            ResultCode.NOT_FOUND,
            "result.content.key_not_found",
            key
        );
    }

    private static String resolveRequestLocale() {
        return LocaleContext.get().tag();
    }

    private static SiteContentResp emptyPublicContent(String key, String requestedLocale) {
        return new SiteContentResp(
            key,
            "",
            "",
            requestedLocale,
            null,
            requestedLocale,
            requestedLocale,
            false
        );
    }

    private static SiteContentEntity newEntity(String contentKey, String locale) {
        SiteContentEntity created = new SiteContentEntity();
        created.setId(new SiteContentId(contentKey, locale));
        return created;
    }

    private SiteContentResp toResp(SiteContentEntity entity) {
        String locale = entity.getLocale();
        return toResp(entity, locale, locale, false);
    }

    private SiteContentResp toResp(ResolvedSiteContent resolved) {
        return toResp(
            resolved.entity(),
            resolved.requestedLocale(),
            resolved.resolvedLocale(),
            resolved.localeFallback()
        );
    }

    private SiteContentResp toResp(
        SiteContentEntity entity,
        String requestedLocale,
        String resolvedLocale,
        boolean localeResolved
    ) {
        return new SiteContentResp(
            entity.getContentKey(),
            entity.getTitle(),
            entity.getBodyMd(),
            entity.getLocale(),
            entity.getUpdatedAt(),
            requestedLocale,
            resolvedLocale,
            localeResolved
        );
    }

    private record ResolvedSiteContent(
        SiteContentEntity entity,
        String requestedLocale,
        String resolvedLocale,
        boolean localeFallback
    ) {
    }
}
