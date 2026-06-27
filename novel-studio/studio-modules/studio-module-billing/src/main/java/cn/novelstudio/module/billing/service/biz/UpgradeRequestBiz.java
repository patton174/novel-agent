package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.QuotaOverrideReq;
import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import cn.novelstudio.module.billing.repository.UpgradeRequestRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class UpgradeRequestBiz {

    private final UpgradeRequestRepository repo;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Transactional
    public String create(Long userId, String requestType, String targetValue, String reason) {
        UpgradeRequestEntity e = new UpgradeRequestEntity();
        e.setUserId(userId);
        e.setRequestType(requestType);
        e.setTargetValue(targetValue);
        e.setReason(reason);
        e.setStatus("pending");
        repo.save(e);
        auditLogService.log(
            userId,
            "upgrade_request.create",
            "user",
            String.valueOf(userId),
            null,
            Map.of("type", requestType, "target", targetValue)
        );
        return e.getId();
    }

    @Transactional(readOnly = true)
    public Page<UpgradeRequestEntity> list(String status, int pageCurrent, int pageSize) {
        PageRequest p = PageRequest.of(Math.max(0, pageCurrent - 1), pageSize);
        return (status == null || status.isBlank())
            ? repo.findAllByOrderByCreatedAtDesc(p)
            : repo.findByStatusOrderByCreatedAtDesc(status, p);
    }

    @Transactional(readOnly = true)
    public List<UpgradeRequestEntity> listMine(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void approve(String id, Long adminId, String note) {
        UpgradeRequestEntity e = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("申请不存在"));
        if (!"pending".equals(e.getStatus())) {
            throw new IllegalStateException("申请已处理");
        }
        switch (e.getRequestType()) {
            case "plan" -> subscriptionBiz.changeUserPlan(
                e.getUserId(),
                e.getTargetValue(),
                adminId,
                "审批升级"
            );
            case "quota_bonus" -> applyQuotaBonus(e.getUserId(), parseBonus(e.getTargetValue()), adminId);
            default -> throw new IllegalArgumentException("未知申请类型");
        }
        e.setStatus("approved");
        e.setReviewedBy(adminId);
        e.setReviewedAt(Instant.now());
        e.setReviewNote(note);
        repo.save(e);
        auditLogService.log(
            adminId,
            "upgrade_request.approve",
            "upgrade_request",
            id,
            Map.of("status", "pending"),
            Map.of("status", "approved", "note", note == null ? "" : note)
        );
    }

    @Transactional
    public void reject(String id, Long adminId, String note) {
        UpgradeRequestEntity e = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("申请不存在"));
        if (!"pending".equals(e.getStatus())) {
            throw new IllegalStateException("申请已处理");
        }
        e.setStatus("rejected");
        e.setReviewedBy(adminId);
        e.setReviewedAt(Instant.now());
        e.setReviewNote(note);
        repo.save(e);
        auditLogService.log(
            adminId,
            "upgrade_request.reject",
            "upgrade_request",
            id,
            Map.of("status", "pending"),
            Map.of("status", "rejected", "note", note == null ? "" : note)
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBonus(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("quota_bonus 值格式错误");
        }
    }

    private void applyQuotaBonus(long userId, Map<String, Object> bonus, Long actorId) {
        long tokenBonus = toLong(bonus.get("tokenBonus"));
        int runBonus = toInt(bonus.get("runBonus"));
        QuotaOverrideReq req = new QuotaOverrideReq(tokenBonus, runBonus, null, "审批升级");
        usageCrmBiz.addQuotaOverride(userId, req, actorId);
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }
}
