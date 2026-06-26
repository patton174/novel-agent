package cn.novelstudio.module.content.service.model;

import cn.novelstudio.kernel.exception.ValidationException;

import java.math.BigDecimal;

/** 平台模型档位倍率：轻量 1–1.5、性能 1.5–2.5、极致 2.5–3 */
public final class ModelPriceTier {

    public enum Tier {
        LIGHT,
        BALANCED,
        EXTREME
    }

    private ModelPriceTier() {}

    public static void requireValidMultiplier(BigDecimal multiplier) {
        if (multiplier == null) {
            return;
        }
        if (tierOf(multiplier) != null) {
            return;
        }
        throw ValidationException.keyed("model.price_tier_invalid");
    }

    public static Tier tierOf(BigDecimal multiplier) {
        if (multiplier == null) {
            return null;
        }
        double v = multiplier.doubleValue();
        if (v >= 1.0 && v <= 1.5) {
            return Tier.LIGHT;
        }
        if (v > 1.5 && v <= 2.5) {
            return Tier.BALANCED;
        }
        if (v > 2.5 && v <= 3.0) {
            return Tier.EXTREME;
        }
        return null;
    }

    /** 根据用户消息长度与关键词估计任务复杂度，映射到档位。 */
    public static Tier classifyComplexity(String message) {
        if (message == null || message.isBlank()) {
            return Tier.BALANCED;
        }
        String text = message.trim();
        int len = text.length();
        if (len < 80 && !looksComplex(text)) {
            return Tier.LIGHT;
        }
        if (len > 420 || looksComplex(text)) {
            return Tier.EXTREME;
        }
        return Tier.BALANCED;
    }

    private static boolean looksComplex(String text) {
        String lower = text.toLowerCase();
        return lower.contains("重构")
            || lower.contains("架构")
            || lower.contains("全书")
            || lower.contains("大纲")
            || lower.contains("世界观")
            || lower.contains("多章节")
            || lower.contains("outline")
            || lower.contains("worldbuilding")
            || lower.contains("world view")
            || lower.contains("multi-chapter")
            || lower.contains("full book")
            || lower.contains("rewrite")
            || lower.contains("refactor")
            || lower.contains("architecture");
    }
}
