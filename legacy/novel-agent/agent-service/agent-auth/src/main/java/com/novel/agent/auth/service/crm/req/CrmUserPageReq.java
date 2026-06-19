package com.novel.agent.auth.service.crm.req;

public record CrmUserPageReq(
    int pageCurrent,
    int pageSize,
    String usernameKeyword
) {}
