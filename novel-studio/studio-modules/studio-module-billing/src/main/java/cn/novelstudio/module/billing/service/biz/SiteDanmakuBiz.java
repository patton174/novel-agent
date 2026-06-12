package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.dto.SiteDanmakuResp;
import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SiteDanmakuBiz extends BaseBiz {

    private final SiteDanmakuRepository siteDanmakuRepository;
    private final IpRegionResolver ipRegionResolver;

    public Result<List<SiteDanmakuResp>> listRecent() {
        List<SiteDanmakuResp> list = siteDanmakuRepository.findTop120ByOrderByCreatedAtDesc().stream()
            .map(this::toResp)
            .toList();
        return ok(list);
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
            throw new BizException(ResultCode.BAD_REQUEST, "弹幕太短");
        }

        SiteDanmakuEntity entity = new SiteDanmakuEntity();
        entity.setMessage(message);
        entity.setClientIp(clientIp);

        if (userId != null && userId > 0) {
            entity.setUserId(userId);
            entity.setAuthorName(sanitizeAuthorName(username, userId));
            entity.setRegion(null);
        } else {
            entity.setAuthorName("访客");
            entity.setRegion(ipRegionResolver.resolveRegion(clientIp));
        }

        SiteDanmakuEntity saved = siteDanmakuRepository.save(entity);
        return ok(toResp(saved));
    }

    private String sanitizeAuthorName(String username, Long userId) {
        if (username != null && !username.isBlank()) {
            String trimmed = username.trim();
            return trimmed.length() > 64 ? trimmed.substring(0, 64) : trimmed;
        }
        return "用户" + userId;
    }

    private SiteDanmakuResp toResp(SiteDanmakuEntity entity) {
        return new SiteDanmakuResp(
            entity.getId(),
            entity.getMessage(),
            entity.getAuthorName(),
            entity.getRegion(),
            entity.getUserId(),
            entity.getCreatedAt()
        );
    }
}
