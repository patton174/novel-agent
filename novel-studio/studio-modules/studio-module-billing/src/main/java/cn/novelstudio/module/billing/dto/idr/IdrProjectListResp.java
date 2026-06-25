package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrProjectListResp(
    List<IdrProjectItemResp> projects
) {
}
