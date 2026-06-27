package cn.novelstudio.module.auth.service.crm.biz;

import cn.novelstudio.module.auth.client.BillingAuditClient;
import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import cn.novelstudio.module.auth.repository.InviteCodeRepository;
import cn.novelstudio.module.auth.service.InviteCodeService;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmCreateReq;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmUpdateReq;
import cn.novelstudio.module.auth.service.crm.resp.InviteCrmItemResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.tools.IdWorker;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class InviteCrmBiz extends BaseBiz {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final InviteCodeRepository inviteCodeRepository;
    private final BillingAuditClient billingAuditClient;
    private final ObjectMapper objectMapper;

    public Result<List<InviteCrmItemResp>> listAll() {
        List<InviteCrmItemResp> items = inviteCodeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
            .map(this::toResp)
            .toList();
        return ok(items);
    }

    @Transactional
    public Result<InviteCrmItemResp> create(InviteCrmCreateReq req, Long actorId) {
        InviteCodeService.validateRewardType(req.rewardType());
        InviteCodeEntity entity = new InviteCodeEntity();
        entity.setId(IdWorker.getId());
        entity.setCode(generateUniqueCode());
        entity.setCreatedBy(actorId);
        entity.setMaxUses(Math.max(req.maxUses(), 0));
        entity.setUsedCount(0);
        entity.setExpiresAt(req.expiresAt());
        entity.setRewardType(req.rewardType());
        entity.setRewardPayload(normalizePayload(req.rewardPayload()));
        entity.setStatus("active");
        InviteCodeEntity saved = inviteCodeRepository.save(entity);
        if (actorId != null) {
            billingAuditClient.logInviteCreate(actorId, saved.getId(), saved.getCode(), toAuditMap(saved));
        }
        return ok(toResp(saved));
    }

    @Transactional
    public Result<InviteCrmItemResp> update(long id, InviteCrmUpdateReq req, Long actorId) {
        InviteCodeEntity entity = inviteCodeRepository.findById(id)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.NOT_FOUND, "auth.invite.not_found"));
        Map<String, Object> before = toAuditMap(entity);
        int usedCount = entity.getUsedCount() == null ? 0 : entity.getUsedCount();

        applyCodeChange(entity, req.code(), usedCount);

        int maxUses = Math.max(req.maxUses(), 0);
        if (maxUses > 0 && maxUses < usedCount) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.invite.max_uses_below_used");
        }
        entity.setMaxUses(maxUses);
        entity.setExpiresAt(req.expiresAt());

        InviteCodeService.validateRewardType(req.rewardType());
        entity.setRewardType(req.rewardType());
        entity.setRewardPayload(normalizePayload(req.rewardPayload()));

        InviteCodeEntity saved = inviteCodeRepository.save(entity);
        if (actorId != null) {
            billingAuditClient.logInviteUpdate(actorId, saved.getId(), before, toAuditMap(saved));
        }
        return ok(toResp(saved));
    }

    @Transactional
    public Result<InviteCrmItemResp> disable(long id, Long actorId) {
        InviteCodeEntity entity = inviteCodeRepository.findById(id)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.NOT_FOUND, "auth.invite.not_found"));
        if ("disabled".equalsIgnoreCase(entity.getStatus())) {
            return ok(toResp(entity));
        }
        Map<String, Object> before = toAuditMap(entity);
        entity.setStatus("disabled");
        InviteCodeEntity saved = inviteCodeRepository.save(entity);
        if (actorId != null) {
            billingAuditClient.logInviteDisable(actorId, saved.getId(), before, toAuditMap(saved));
        }
        return ok(toResp(saved));
    }

    private InviteCrmItemResp toResp(InviteCodeEntity entity) {
        return new InviteCrmItemResp(
            entity.getId(),
            entity.getCode(),
            entity.getCreatedBy(),
            entity.getMaxUses() == null ? 0 : entity.getMaxUses(),
            entity.getUsedCount() == null ? 0 : entity.getUsedCount(),
            entity.getExpiresAt(),
            entity.getRewardType(),
            entity.getRewardPayload(),
            entity.getStatus(),
            entity.getCreatedAt()
        );
    }

    private Map<String, Object> toAuditMap(InviteCodeEntity entity) {
        return Map.of(
            "code", entity.getCode(),
            "maxUses", entity.getMaxUses(),
            "usedCount", entity.getUsedCount(),
            "rewardType", entity.getRewardType(),
            "status", entity.getStatus()
        );
    }

    private void applyCodeChange(InviteCodeEntity entity, String rawCode, int usedCount) {
        if (rawCode == null || rawCode.isBlank()) {
            return;
        }
        String normalized = InviteCodeService.normalizeCode(rawCode);
        if (normalized == null) {
            return;
        }
        if (normalized.equalsIgnoreCase(entity.getCode())) {
            return;
        }
        if (usedCount > 0) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.invite.code_locked");
        }
        inviteCodeRepository.findByCodeIgnoreCase(normalized).ifPresent(existing -> {
            if (!Objects.equals(existing.getId(), entity.getId())) {
                throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.invite.code_exists");
            }
        });
        entity.setCode(normalized);
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = "NA-INV-" + randomSuffix(8);
            if (inviteCodeRepository.findByCodeIgnoreCase(code).isEmpty()) {
                return code;
            }
        }
        throw BizException.keyed(ResultCode.ERROR, "auth.invite.code_generation_failed");
    }

    private static String randomSuffix(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String normalizePayload(String payload) {
        if (payload == null) {
            return null;
        }
        String trimmed = payload.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.invite.invalid_reward_payload");
        }
    }
}
