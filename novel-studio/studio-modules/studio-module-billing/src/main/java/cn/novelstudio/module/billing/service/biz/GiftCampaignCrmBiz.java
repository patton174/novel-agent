package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.GiftCampaignCreateReq;
import cn.novelstudio.module.billing.dto.GiftCampaignCrmResp;
import cn.novelstudio.module.billing.dto.GiftCampaignUpdateReq;
import cn.novelstudio.module.billing.dto.GiftCodeCrmResp;
import cn.novelstudio.module.billing.dto.GiftCodeGenerateReq;
import cn.novelstudio.module.billing.dto.GiftCodeGenerateResp;
import cn.novelstudio.module.billing.entity.GiftCampaignEntity;
import cn.novelstudio.module.billing.entity.GiftRedemptionEntity;
import cn.novelstudio.module.billing.repository.GiftCampaignRepository;
import cn.novelstudio.module.billing.repository.GiftRedemptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.GiftCampaignSupport;
import cn.novelstudio.module.billing.support.GiftCodeGenerator;
import cn.novelstudio.module.billing.support.IdrCdkGenerator;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GiftCampaignCrmBiz extends BaseBiz {

    private static final int MAX_BATCH = 500;

    private final GiftCampaignRepository giftCampaignRepository;
    private final GiftRedemptionRepository giftRedemptionRepository;
    private final AuditLogService auditLogService;

    public Result<List<GiftCampaignCrmResp>> listAll() {
        List<GiftCampaignCrmResp> list = giftCampaignRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResp)
            .toList();
        return ok(list);
    }

    public Result<GiftCampaignCrmResp> get(long id) {
        return ok(toResp(requireCampaign(id)));
    }

    @Transactional
    public Result<GiftCampaignCrmResp> create(GiftCampaignCreateReq req, Long actorId) {
        String giftType = normalizeGiftType(req.giftType());
        validateConfig(giftType, req.config());

        GiftCampaignEntity entity = new GiftCampaignEntity();
        entity.setName(req.name().trim());
        entity.setGiftType(giftType);
        entity.setStatus(GiftCampaignSupport.STATUS_ACTIVE);
        entity.setExpiresAt(req.expiresAt());
        entity.setConfigJson(copyConfig(req.config()));
        entity.setCreatedBy(actorId);

        GiftCampaignEntity saved = giftCampaignRepository.save(entity);
        auditLogService.log(
            actorId,
            "gift.campaign.create",
            "gift_campaign",
            String.valueOf(saved.getId()),
            null,
            toResp(saved)
        );
        return ok(toResp(saved));
    }

    @Transactional
    public Result<GiftCampaignCrmResp> update(long id, GiftCampaignUpdateReq req, Long actorId) {
        GiftCampaignEntity entity = requireCampaign(id);
        GiftCampaignCrmResp before = toResp(entity);

        if (req.name() != null && !req.name().isBlank()) {
            entity.setName(req.name().trim());
        }
        if (req.expiresAt() != null) {
            entity.setExpiresAt(req.expiresAt());
        }
        if (req.config() != null) {
            validateConfig(entity.getGiftType(), req.config());
            entity.setConfigJson(copyConfig(req.config()));
        }
        if (req.status() != null && !req.status().isBlank()) {
            String status = req.status().trim().toLowerCase();
            if (!GiftCampaignSupport.STATUS_ACTIVE.equals(status)
                && !GiftCampaignSupport.STATUS_DISABLED.equals(status)) {
                throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.status_invalid");
            }
            entity.setStatus(status);
        }

        GiftCampaignEntity saved = giftCampaignRepository.save(entity);
        auditLogService.log(
            actorId,
            "gift.campaign.update",
            "gift_campaign",
            String.valueOf(saved.getId()),
            before,
            toResp(saved)
        );
        return ok(toResp(saved));
    }

    public Result<List<GiftCodeCrmResp>> listCodes(long campaignId) {
        requireCampaign(campaignId);
        List<GiftCodeCrmResp> list = giftRedemptionRepository
            .findByCampaignIdOrderByCreatedAtDesc(campaignId)
            .stream()
            .map(this::toCodeResp)
            .toList();
        return ok(list);
    }

    @Transactional
    public Result<GiftCampaignCrmResp> deactivate(long id, Long actorId) {
        GiftCampaignEntity entity = requireCampaign(id);
        GiftCampaignCrmResp before = toResp(entity);
        entity.setStatus(GiftCampaignSupport.STATUS_DISABLED);
        GiftCampaignEntity saved = giftCampaignRepository.save(entity);
        GiftCampaignCrmResp after = toResp(saved);
        auditLogService.log(
            actorId,
            "gift.campaign.disable",
            "gift_campaign",
            String.valueOf(id),
            before,
            after
        );
        return ok(after);
    }

    @Transactional
    public Result<GiftCodeGenerateResp> generateCodes(long id, GiftCodeGenerateReq req, Long actorId) {
        GiftCampaignEntity campaign = requireCampaign(id);
        if (!GiftCampaignSupport.STATUS_ACTIVE.equals(campaign.getStatus())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.campaign_disabled");
        }
        int quantity = req.quantity();
        if (quantity > MAX_BATCH) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.batch_max", MAX_BATCH);
        }

        List<String> redeemCodes = GiftCodeGenerator.generate(quantity);
        List<String> licenseKeys = GiftCampaignSupport.TYPE_LICENSE_KEY.equals(campaign.getGiftType())
            ? IdrCdkGenerator.generate(quantity)
            : List.of();

        List<GiftRedemptionEntity> rows = new ArrayList<>(quantity);
        for (int i = 0; i < quantity; i++) {
            GiftRedemptionEntity row = new GiftRedemptionEntity();
            row.setCampaignId(campaign.getId());
            row.setCode(redeemCodes.get(i));
            row.setStatus(GiftCampaignSupport.REDEMPTION_AVAILABLE);
            if (GiftCampaignSupport.TYPE_LICENSE_KEY.equals(campaign.getGiftType())) {
                row.setFulfillmentJson(Map.of("licenseKey", licenseKeys.get(i)));
            }
            rows.add(row);
        }
        giftRedemptionRepository.saveAll(rows);

        campaign.setCodeCount(campaign.getCodeCount() + quantity);
        giftCampaignRepository.save(campaign);

        auditLogService.log(
            actorId,
            "gift.campaign.generate_codes",
            "gift_campaign",
            String.valueOf(id),
            null,
            Map.of("quantity", quantity, "codeCount", campaign.getCodeCount())
        );
        return ok(new GiftCodeGenerateResp(quantity, redeemCodes));
    }

    private GiftCampaignEntity requireCampaign(long id) {
        return giftCampaignRepository.findById(id)
            .orElseThrow(() -> NotFoundException.keyed("billing.gift.campaign_not_found"));
    }

    private String normalizeGiftType(String giftType) {
        if (giftType == null || giftType.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.type_invalid");
        }
        String normalized = giftType.trim().toLowerCase();
        if (!GiftCampaignSupport.GIFT_TYPES.contains(normalized)) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.type_invalid");
        }
        return normalized;
    }

    private void validateConfig(String giftType, Map<String, Object> config) {
        Map<String, Object> cfg = config == null ? Map.of() : config;
        switch (giftType) {
            case GiftCampaignSupport.TYPE_QUOTA_BONUS -> {
                long tokenBonus = GiftCampaignSupport.longFromConfig(cfg, "tokenBonus", 0L);
                int runBonus = GiftCampaignSupport.intFromConfig(cfg, "runBonus", 0);
                if (tokenBonus <= 0 && runBonus <= 0) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.quota_required");
                }
            }
            case GiftCampaignSupport.TYPE_PLAN_TRIAL -> {
                String planCode = GiftCampaignSupport.stringFromConfig(cfg, "planCode");
                if (planCode == null) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.plan_code_required");
                }
            }
            case GiftCampaignSupport.TYPE_LICENSE_KEY -> {
                // skuId optional — license keys generated locally
            }
            default -> throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.type_invalid");
        }
    }

    private Map<String, Object> copyConfig(Map<String, Object> config) {
        return config == null ? new HashMap<>() : new HashMap<>(config);
    }

    private GiftCampaignCrmResp toResp(GiftCampaignEntity entity) {
        return new GiftCampaignCrmResp(
            entity.getId(),
            entity.getName(),
            entity.getGiftType(),
            entity.getStatus(),
            entity.getExpiresAt(),
            entity.getConfigJson(),
            entity.getCodeCount(),
            entity.getRedeemedCount(),
            entity.getCreatedBy(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private GiftCodeCrmResp toCodeResp(GiftRedemptionEntity entity) {
        Long userId = entity.getUserId();
        return new GiftCodeCrmResp(
            entity.getId(),
            entity.getCampaignId(),
            entity.getCode(),
            entity.getStatus(),
            userId == null ? null : String.valueOf(userId),
            entity.getRedeemedAt(),
            entity.getCreatedAt()
        );
    }
}
