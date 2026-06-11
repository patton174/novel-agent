package cn.novelstudio.module.auth.service.crm.req;

public record CrmUserPageReq(
    int pageCurrent,
    int pageSize,
    String usernameKeyword
) {}
