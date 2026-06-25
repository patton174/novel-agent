package cn.novelstudio.module.billing.dto.idr;

public record IdrSkuItemResp(
    String id,
    String name,
    String status,
    Integer stock,
    String itemType,
    Integer sold,
    Integer itemsNum
) {
}
