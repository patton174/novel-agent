package com.novel.agent.content.service.crm.resp;

import java.util.List;

public record CrmStatsTrendResp(
    List<CrmTrendPointResp> registrationTrend,
    List<CrmTrendPointResp> agentRunTrend
) {}
