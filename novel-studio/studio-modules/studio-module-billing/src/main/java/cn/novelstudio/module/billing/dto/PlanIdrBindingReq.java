package cn.novelstudio.module.billing.dto;

public record PlanIdrBindingReq(
    String idrProjectId,
    String idrSkuId
) {
}
