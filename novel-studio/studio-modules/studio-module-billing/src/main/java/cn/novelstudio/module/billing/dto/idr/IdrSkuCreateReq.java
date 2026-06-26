package cn.novelstudio.module.billing.dto.idr;

public record IdrSkuCreateReq(
    String name,
    String status,
    Integer quantity
) {
}
