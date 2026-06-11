package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteContentResp;
import cn.novelstudio.module.billing.dto.SiteContentUpdateReq;
import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.repository.SiteContentRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.SiteContentKeys;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SiteContentBiz extends BaseBiz {

    private final SiteContentRepository siteContentRepository;
    private final AuditLogService auditLogService;

    public Result<SiteContentResp> getPublic(String key) {
        SiteContentEntity entity = requireContent(key);
        return ok(toResp(entity));
    }

    public Result<List<SiteContentResp>> listAll() {
        List<SiteContentResp> list = siteContentRepository.findAllByOrderByContentKeyAsc().stream()
            .map(this::toResp)
            .toList();
        return ok(list);
    }

    @Transactional
    public Result<SiteContentResp> update(String key, SiteContentUpdateReq req, Long actorId) {
        SiteContentKeys.requireAllowed(key);
        SiteContentEntity entity = siteContentRepository.findById(key.trim())
            .orElseGet(() -> {
                SiteContentEntity created = new SiteContentEntity();
                created.setContentKey(key.trim());
                created.setLocale("zh-CN");
                return created;
            });
        Map<String, String> before = Map.of(
            "title", entity.getTitle() == null ? "" : entity.getTitle(),
            "bodyMd", entity.getBodyMd() == null ? "" : entity.getBodyMd()
        );
        entity.setTitle(req.title().trim());
        entity.setBodyMd(req.bodyMd());
        entity.setUpdatedBy(actorId);
        SiteContentEntity saved = siteContentRepository.save(entity);
        auditLogService.log(
            actorId,
            "site.content.update",
            "site_content",
            key,
            before,
            Map.of("title", saved.getTitle(), "bodyMd", saved.getBodyMd())
        );
        return ok(toResp(saved));
    }

    private SiteContentEntity requireContent(String key) {
        SiteContentKeys.requireAllowed(key);
        return siteContentRepository.findById(key.trim())
            .orElseThrow(() -> new NotFoundException(ResultCode.NOT_FOUND, "内容不存在: " + key));
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
