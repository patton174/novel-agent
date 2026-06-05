package com.novel.agent.auth.service.crm.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CrmUserUpdateReq(
    @NotBlank(message = "角色不能为空")
    String role,
    @NotNull(message = "状态不能为空")
    Boolean isActive
) {}
