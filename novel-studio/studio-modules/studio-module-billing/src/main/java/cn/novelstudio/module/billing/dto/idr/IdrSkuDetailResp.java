package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrSkuDetailResp(
    String id,
    String name,
    String status,
    Integer stock,
    String itemType,
    Integer itemsNum,
    Integer sold,
    Boolean hiddenStock,
    String projectId,
    List<String> items
) {
}
