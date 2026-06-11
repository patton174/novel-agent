package cn.novelstudio.module.auth.service.crm.resp;

public record CrmUserDetailResp(
    Long id,
    String username,
    String email,
    String role,
    Boolean isActive,
    Boolean emailVerified
) {}
