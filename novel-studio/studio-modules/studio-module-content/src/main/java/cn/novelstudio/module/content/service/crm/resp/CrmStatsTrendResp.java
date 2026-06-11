package cn.novelstudio.module.content.service.crm.resp;

import java.util.List;

public record CrmStatsTrendResp(
    List<CrmTrendPointResp> registrationTrend,
    List<CrmTrendPointResp> agentRunTrend
) {}
