package cn.novelstudio.module.content.service.model;

import java.math.BigDecimal;

/** 平台模型档位倍率：轻量 1–1.5、性能 1.5–2.5、极致 2.5–3 */
public final class ModelPriceTier {

    private ModelPriceTier() {}

    public static void requireValidMultiplier(BigDecimal multiplier) {
        if (multiplier == null) {
            return;
        }
        double v = multiplier.doubleValue();
        if (v >= 1.0 && v <= 1.5) {
            return;
        }
        if (v > 1.5 && v <= 2.5) {
            return;
        }
        if (v > 2.5 && v <= 3.0) {
            return;
        }
        throw new IllegalArgumentException("价格倍率须为轻量(1–1.5)、性能(1.5–2.5)或极致(2.5–3)");
    }
}
