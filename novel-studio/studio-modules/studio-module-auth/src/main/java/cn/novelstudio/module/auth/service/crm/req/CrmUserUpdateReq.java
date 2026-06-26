package cn.novelstudio.module.auth.service.crm.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CrmUserUpdateReq(
    @NotBlank(message = "{validation.auth.role_required}")
    String role,
    @NotNull(message = "{validation.auth.status_required}")
    Boolean isActive
) {}
