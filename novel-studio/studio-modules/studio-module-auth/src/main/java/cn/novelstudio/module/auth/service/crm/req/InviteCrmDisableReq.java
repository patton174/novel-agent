package cn.novelstudio.module.auth.service.crm.req;

import jakarta.validation.constraints.NotNull;

public record InviteCrmDisableReq(
    @NotNull Long id
) {}
