package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.dto.SiteDanmakuPageResp;
import cn.novelstudio.module.billing.dto.SiteDanmakuResp;
import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SiteDanmakuBiz extends BaseBiz {

    private static final String SOURCE_LOCALE = AppLocale.ZH_CN.tag();

    private final SiteDanmakuRepository siteDanmakuRepository;
    private final IpRegionResolver ipRegionResolver;
    private final StudioMessages messages;

    public Result<List<SiteDanmakuResp>> listRecent() {
        List<SiteDanmakuResp> list = siteDanmakuRepository.findTop120ByOrderByCreatedAtDesc().stream()
            .map(this::toResp)
            .toList();
        return ok(list);
    }

    public Result<SiteDanmakuPageResp> listPage(int pageSize, Long beforeId) {
        int size = Math.max(1, Math.min(pageSize, 50));
        PageRequest page = PageRequest.of(0, size + 1);
        List<SiteDanmakuEntity> rows = beforeId == null || beforeId <= 0
            ? siteDanmakuRepository.findByOrderByCreatedAtDesc(page)
            : siteDanmakuRepository.findByIdLessThanOrderByCreatedAtDesc(beforeId, page);

        boolean hasMore = rows.size() > size;
        List<SiteDanmakuEntity> slice = hasMore ? rows.subList(0, size) : rows;
        List<SiteDanmakuResp> list = slice.stream().map(this::toResp).toList();
        Long nextBeforeId = list.isEmpty() ? null : list.get(list.size() - 1).id();

        return ok(new SiteDanmakuPageResp(list, hasMore, nextBeforeId));
    }

    @Transactional
    public Result<SiteDanmakuResp> create(
        SiteDanmakuCreateReq req,
        Long userId,
        String username,
        String clientIp
    ) {
        String message = req.message().trim();
        if (message.length() < 2) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.danmaku.too_short");
        }

        if (userId != null && userId > 0 && siteDanmakuRepository.existsByUserId(userId)) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.danmaku.already_reviewed");
        }

        SiteDanmakuEntity entity = new SiteDanmakuEntity();
        entity.setMessage(message);
        entity.setClientIp(clientIp);
        entity.setAuthorName("");

        if (userId != null && userId > 0) {
            entity.setUserId(userId);
            String author = sanitizeAuthorName(username);
            if (author != null) {
                entity.setAuthorName(author);
            }
            entity.setRegion(null);
        } else {
            entity.setRegion(ipRegionResolver.resolveRegion(clientIp));
        }

        SiteDanmakuEntity saved = siteDanmakuRepository.save(entity);
        return ok(toResp(saved));
    }

    private String sanitizeAuthorName(String username) {
        if (username != null && !username.isBlank()) {
            String trimmed = username.trim();
            return trimmed.length() > 64 ? trimmed.substring(0, 64) : trimmed;
        }
        return null;
    }

    private String resolveAuthorName(SiteDanmakuEntity entity) {
        if (entity.getUserId() != null && entity.getUserId() > 0) {
            String stored = entity.getAuthorName();
            if (stored != null && !stored.isBlank()) {
                return stored;
            }
            return messages.get("billing.danmaku.user_author", entity.getUserId());
        }
        String stored = entity.getAuthorName();
        if (stored != null && !stored.isBlank()) {
            return stored;
        }
        return messages.get("billing.danmaku.guest_author");
    }

    private ResolvedMessage resolveMessage(SiteDanmakuEntity entity, String requestedLocale) {
        if (!AppLocale.EN.tag().equals(requestedLocale)) {
            return new ResolvedMessage(entity.getMessage(), SOURCE_LOCALE, false);
        }
        String english = entity.getMessageEn();
        if (english != null && !english.isBlank()) {
            return new ResolvedMessage(english, AppLocale.EN.tag(), false);
        }
        return new ResolvedMessage(entity.getMessage(), SOURCE_LOCALE, true);
    }

    private SiteDanmakuResp toResp(SiteDanmakuEntity entity) {
        String requestedLocale = LocaleContext.get().tag();
        ResolvedMessage resolved = resolveMessage(entity, requestedLocale);
        return new SiteDanmakuResp(
            entity.getId(),
            resolved.text(),
            resolveAuthorName(entity),
            entity.getRegion(),
            entity.getUserId(),
            entity.getCreatedAt(),
            requestedLocale,
            resolved.resolvedLocale(),
            resolved.localeFallback()
        );
    }

    private record ResolvedMessage(String text, String resolvedLocale, boolean localeFallback) {
    }
}
