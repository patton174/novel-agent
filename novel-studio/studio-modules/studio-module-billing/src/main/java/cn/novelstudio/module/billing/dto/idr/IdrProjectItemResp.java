package cn.novelstudio.module.billing.dto.idr;

public record IdrProjectItemResp(
    String id,
    String name,
    String status,
    String type,
    String slug,
    String desc
) {
}
