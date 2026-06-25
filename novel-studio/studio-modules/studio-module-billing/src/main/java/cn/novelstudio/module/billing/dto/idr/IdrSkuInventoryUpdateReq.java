package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrSkuInventoryUpdateReq(
    String mode,
    String itemType,
    List<String> items,
    Integer quantity,
    String status
) {
}
