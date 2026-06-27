package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import cn.novelstudio.module.billing.entity.RedemptionRecordEntity;
import cn.novelstudio.module.billing.repository.RedemptionCodeRepository;
import cn.novelstudio.module.billing.repository.RedemptionRecordRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class RedemptionBiz {

    private final RedemptionCodeRepository codeRepo;
    private final RedemptionRecordRepository recordRepo;
    private final UserBalanceBiz balanceBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Transactional
    public String redeem(Long userId, String code) {
        RedemptionCodeEntity c = codeRepo.findByCode(code)
            .orElseThrow(() -> new IllegalArgumentException("兑换码无效"));
        if (c.getExpiresAt() != null && c.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("兑换码已过期");
        }
        if (recordRepo.existsByCodeIdAndUserId(c.getId(), userId)) {
            throw new IllegalArgumentException("该兑换码已使用过");
        }
        int affected = codeRepo.consumeOne(c.getId());
        if (affected == 0) {
            throw new IllegalArgumentException("兑换码已用尽");
        }

        RedemptionRecordEntity rec = new RedemptionRecordEntity();
        rec.setCodeId(c.getId());
        rec.setUserId(userId);
        recordRepo.save(rec);

        String applied;
        switch (c.getType()) {
            case "balance" -> {
                long amount = Long.parseLong(c.getValue());
                balanceBiz.credit(userId, amount);
                applied = "余额充值 " + amount + " 微分";
            }
            case "plan" -> {
                subscriptionBiz.changeUserPlan(userId, c.getValue(), userId, "CDK 兑换套餐");
                applied = "套餐切换为 " + c.getValue();
            }
            case "quota_bonus" -> {
                Map<String, Object> bonus = parseBonus(c.getValue());
                applyQuotaBonus(userId, bonus, userId);
                applied = "额外额度 " + c.getValue();
            }
            default -> throw new IllegalArgumentException("未知兑换码类型: " + c.getType());
        }

        auditLogService.log(
            userId,
            "redemption.redeem",
            "redemption_code",
            c.getId(),
            null,
            Map.of("type", c.getType(), "value", c.getValue(), "applied", applied)
        );
        return applied;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBonus(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("quota_bonus 值格式错误");
        }
    }

    private void applyQuotaBonus(long userId, Map<String, Object> bonus, Long actorId) {
        long tokenBonus = toLong(bonus.get("tokenBonus"));
        int runBonus = toInt(bonus.get("runBonus"));
        usageCrmBiz.grantQuotaBonusFromGift(
            userId,
            tokenBonus,
            runBonus,
            null,
            "CDK 兑换",
            actorId
        );
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
