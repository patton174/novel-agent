package com.novel.agent.billing.service.biz;

import com.novel.agent.billing.dto.AuditLogResp;
import com.novel.agent.billing.entity.AuditLogEntity;
import com.novel.agent.billing.repository.AuditLogRepository;
import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuditLogBiz extends BaseBiz {

    private final AuditLogRepository auditLogRepository;

    public Result<Page<AuditLogResp>> page(String action, Long actorId, int pageCurrent, int pageSize) {
        var pageable = PageRequest.of(
            Math.max(pageCurrent - 1, 0),
            Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        var page = auditLogRepository.search(
            action == null || action.isBlank() ? null : action.trim(),
            actorId,
            pageable
        );
        List<AuditLogResp> list = page.getContent().stream().map(this::toResp).toList();
        return ok(Page.of(list, page.getTotalElements(), pageCurrent, pageSize));
    }

    private AuditLogResp toResp(AuditLogEntity entity) {
        return new AuditLogResp(
            entity.getId(),
            entity.getActorId(),
            entity.getAction(),
            entity.getTargetType(),
            entity.getTargetId(),
            entity.getBeforeJson(),
            entity.getAfterJson(),
            entity.getCreatedAt()
        );
    }
}
